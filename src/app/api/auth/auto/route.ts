import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const FIVE_MINUTES = 5 * 60

/**
 * 입시내비 WebView 자동 인증
 *
 * GET /api/auth/auto?nid={숫자PK}&ts={Unix초}&sig={HMAC서명}&sname={이름,선택}&user_id={한글ID,선택}
 *
 * 입시내비 앱이 WebView를 열 때 이 URL로 바로 진입합니다.
 * HMAC 서명을 자체 검증하므로 입시내비 서버에 추가 API 호출이 필요 없습니다.
 *
 * 흐름: HMAC 검증 → Supabase 유저 생성/조회 → 세션 쿠키 직접 설정 → /study 리다이렉트
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const nid = searchParams.get('nid')
    const ts = searchParams.get('ts')
    const sig = searchParams.get('sig')
    const sname = searchParams.get('sname') || null
    const userId = searchParams.get('user_id') || null
    const redirect = searchParams.get('redirect') || '/study'

    // ── 1. 필수 파라미터 ────────────────────────────────────────────
    if (!nid || !ts || !sig) {
        return new NextResponse('Missing required parameters: nid, ts, sig', { status: 400 })
    }

    // ── 2. HMAC-SHA256 서명 검증 ────────────────────────────────────
    const secret = process.env.AUTH_HMAC_SECRET?.trim()
    if (!secret) {
        console.error('AUTH_HMAC_SECRET is not set')
        return new NextResponse('Server configuration error', { status: 500 })
    }

    const message = `${nid}:${ts}`
    const expected = crypto.createHmac('sha256', secret).update(message).digest('hex')

    let valid = false
    try {
        if (expected.length === sig.length) {
            valid = crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(sig, 'utf8'))
        }
    } catch { /* length mismatch */ }

    if (!valid) {
        console.error('Auto-auth HMAC verification failed for nid:', nid)
        return new NextResponse('Invalid signature', { status: 401 })
    }

    // ── 3. 타임스탬프 유효성 (5분) ──────────────────────────────────
    const tsNum = parseInt(ts, 10)
    const now = Math.floor(Date.now() / 1000)
    if (isNaN(tsNum) || Math.abs(now - tsNum) > FIVE_MINUTES) {
        return new NextResponse('Token expired', { status: 401 })
    }

    // ── 4. Supabase Admin: 유저 생성/조회 ────────────────────────────
    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const email = `nid_${nid}@inputnavi.internal`
    const displayName = sname || `학생_${nid}`

    const nidNum = parseInt(nid!, 10)

    // ── ipsinavi_Login_info 조회/생성 → loginInfoId 확보 ──
    let loginInfoId: number
    const { data: existingLogin } = await adminClient
        .from('ipsinavi_login_info')
        .select('id')
        .eq('UserNID', nidNum)
        .single()

    if (existingLogin) {
        loginInfoId = existingLogin.id
    } else {
        const { data: inserted } = await adminClient.from('ipsinavi_login_info').insert({
            UserNID: nidNum,
            UserName: displayName,
            status: 'active',
            expires_at: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
        }).select('id').single()
        loginInfoId = inserted!.id
    }

    const { error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
            nid,
            sname: displayName,
            external_user_id: userId,
            source: 'inputnavi',
            login_info_id: loginInfoId,
        },
    })

    if (createError && !createError.message.includes('already been registered')) {
        console.error('Auto-provisioning error:', createError.message)
        return new NextResponse('Failed to provision user', { status: 500 })
    }

    // 기존 유저: sname 최신화 + login_info_id 보장
    if (createError?.message.includes('already been registered')) {
        const { data: users } = await adminClient.auth.admin.listUsers()
        const existingUser = users?.users?.find(u => u.email === email)
        if (existingUser) {
            await adminClient.auth.admin.updateUserById(existingUser.id, {
                user_metadata: { ...existingUser.user_metadata, sname: sname || existingUser.user_metadata?.sname, external_user_id: userId || existingUser.user_metadata?.external_user_id, login_info_id: loginInfoId },
            })
            // supabase_uid 연결
            adminClient.from('ipsinavi_login_info').update({ supabase_uid: existingUser.id }).eq('id', loginInfoId).then(() => {})
            await adminClient.from('profiles').upsert({ id: loginInfoId, name: sname || displayName }, { onConflict: 'id' })
        }
    } else if (!createError) {
        // 신규 유저
        const { data: users } = await adminClient.auth.admin.listUsers()
        const newUser = users?.users?.find(u => u.email === email)
        if (newUser) {
            adminClient.from('ipsinavi_login_info').update({ supabase_uid: newUser.id }).eq('id', loginInfoId).then(() => {})
            await adminClient.from('profiles').upsert({ id: loginInfoId, name: displayName }, { onConflict: 'id' })
        }
    }

    // ── 5. Magic Link 생성 → 서버에서 직접 세션 설정 (리다이렉트 없이) ──
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email,
    })

    if (linkError || !linkData?.properties?.hashed_token) {
        console.error('generateLink error:', linkError?.message)
        return new NextResponse('Failed to create session', { status: 500 })
    }

    // 서버 쿠키에 세션 직접 기록 (Supabase 리다이렉트 체인 생략)
    const cookieStore = await cookies()
    const serverClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setAll(cookiesToSet: any[]) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    cookiesToSet.forEach(({ name, value, options }: any) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    )

    const { error: otpError } = await serverClient.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'email',
    })

    if (otpError) {
        console.error('verifyOtp error:', otpError.message)
        return new NextResponse('Failed to establish session', { status: 500 })
    }

    // ── 6. 학습 페이지로 리다이렉트 (세션 쿠키 이미 설정됨) ─────────
    const origin = `${request.nextUrl.protocol}//${request.nextUrl.host}`
    return NextResponse.redirect(`${origin}${redirect}`)
}
