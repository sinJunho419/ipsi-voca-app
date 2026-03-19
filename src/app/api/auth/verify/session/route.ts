import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const FIVE_MINUTES = 5 * 60

const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

/** XOR 복호화 */
function xorDecrypt(encrypted: Buffer, key: string): string {
    const keyBytes = Buffer.from(key, 'utf8')
    const result = Buffer.alloc(encrypted.length)
    for (let i = 0; i < encrypted.length; i++) {
        result[i] = encrypted[i] ^ keyBytes[i % keyBytes.length]
    }
    return result.toString('utf8')
}

/** XOR 암호화 → Base64 */
function xorEncryptToBase64(plaintext: string, key: string): string {
    const textBytes = Buffer.from(plaintext, 'utf8')
    const keyBytes = Buffer.from(key, 'utf8')
    const result = Buffer.alloc(textBytes.length)
    for (let i = 0; i < textBytes.length; i++) {
        result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length]
    }
    return result.toString('base64')
}

/**
 * POST /api/auth/verify/session
 *
 * 극한 최적화:
 * - 입시내비 API: fire-and-forget
 * - generateLink 먼저 시도 (재방문 유저 fast path)
 * - 실패 시에만 createUser → generateLink 재시도
 * - updateUser, profiles upsert: fire-and-forget (세션에 불필요)
 * - verifyOtp만 await (세션 생성 필수)
 */
export async function POST(request: NextRequest) {
    const t0 = Date.now()
    try {
        const { payload } = await request.json()

        if (!payload) {
            return NextResponse.json({ ok: false, error: '비정상 접근입니다.' })
        }

        const secretKey = process.env.VOCA_SECRET_KEY?.trim()
        if (!secretKey) {
            return NextResponse.json({ ok: false, error: '비정상 접근입니다.' })
        }

        // 복호화
        const encrypted = Buffer.from(payload, 'base64')
        const decrypted = xorDecrypt(encrypted, secretKey)
        const parts = decrypted.split('|')

        if (parts.length < 3) {
            return NextResponse.json({ ok: false, error: '비정상 접근입니다.' })
        }

        const nid = parts[0]
        const name = parts[1]
        const ts = parseInt(parts[2], 10)

        if (!nid || !name || isNaN(ts)) {
            return NextResponse.json({ ok: false, error: '비정상 접근입니다.' })
        }

        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - ts) > FIVE_MINUTES) {
            return NextResponse.json({ ok: false, error: '인증 시간이 만료되었습니다.' })
        }

        const email = `nid_${nid}@inputnavi.internal`
        const displayName = name || `학생_${nid}`

        console.log(`[auth] ${nid} 시작 +${Date.now() - t0}ms`)

        // ── 입시내비 API: fire-and-forget ──
        const verifyPayload = xorEncryptToBase64(decrypted, secretKey)
        fetch('https://m.ipsinavi.com/ipsivoca_Api.asp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `payload=${encodeURIComponent(verifyPayload)}`,
        }).then(async res => {
            const data = await res.json()
            if (data.status !== 'active') {
                console.warn(`[auth] 입시내비 비활성: nid=${nid}, status=${data.status}`)
            }
        }).catch(() => {})

        // ── generateLink 먼저 시도 (재방문 유저 fast path) ──
        let linkData = (await adminClient.auth.admin.generateLink({
            type: 'magiclink',
            email,
        })).data

        console.log(`[auth] ${nid} generateLink 1차 +${Date.now() - t0}ms`)

        // 유저가 없으면 생성 후 재시도
        if (!linkData?.properties?.hashed_token) {
            await adminClient.auth.admin.createUser({
                email,
                email_confirm: true,
                user_metadata: { nid, sname: displayName, source: 'inputnavi' },
            })
            const retry = await adminClient.auth.admin.generateLink({
                type: 'magiclink',
                email,
            })
            linkData = retry.data
            console.log(`[auth] ${nid} createUser+retry +${Date.now() - t0}ms`)
        }

        if (!linkData?.properties?.hashed_token) {
            return NextResponse.json({ ok: false, error: '세션 생성에 실패했습니다.' })
        }

        const userId = linkData.user.id
        const nidNum = parseInt(nid, 10)

        // ── ipsinavi_Login_info 조회/생성 → loginInfoId 확보 ──
        let loginInfoId: number
        const { data: existingLogin } = await adminClient
            .from('ipsinavi_login_info')
            .select('id')
            .eq('UserNID', nidNum)
            .single()

        if (existingLogin) {
            loginInfoId = existingLogin.id
            // expires_at 갱신
            adminClient.from('ipsinavi_login_info')
                .update({
                    expires_at: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
                    status: 'active',
                    supabase_uid: userId,
                })
                .eq('id', loginInfoId)
                .then(() => {})
        } else {
            const { data: inserted } = await adminClient.from('ipsinavi_login_info').insert({
                UserNID: nidNum,
                UserName: displayName,
                status: 'active',
                supabase_uid: userId,
                expires_at: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
            }).select('id').single()
            loginInfoId = inserted!.id
        }

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

        // ── verifyOtp만 await (세션 생성 필수) ──
        const otpResult = await serverClient.auth.verifyOtp({
            token_hash: linkData.properties.hashed_token,
            type: 'email',
        })

        console.log(`[auth] ${nid} verifyOtp +${Date.now() - t0}ms`)

        if (otpResult.error) {
            console.error('verifyOtp error:', otpResult.error.message)
            return NextResponse.json({ ok: false, error: '세션 설정에 실패했습니다.' })
        }

        // ── updateUser, profiles upsert: fire-and-forget (세션에 불필요) ──
        adminClient.auth.admin.updateUserById(userId, {
            user_metadata: { nid, sname: displayName, source: 'inputnavi', login_info_id: loginInfoId },
        }).catch(() => {})

        Promise.resolve(
            adminClient.from('profiles').upsert(
                { id: loginInfoId, name: displayName },
                { onConflict: 'id' }
            )
        ).catch(() => {})

        console.log(`[auth] ${nid} 완료 +${Date.now() - t0}ms`)
        return NextResponse.json({ ok: true, redirect: '/study' })

    } catch (err) {
        console.error('Session error:', err)
        return NextResponse.json({ ok: false, error: '비정상 접근입니다.' })
    }
}
