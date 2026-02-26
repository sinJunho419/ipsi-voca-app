import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const FIVE_MINUTES = 5 * 60 // seconds

/**
 * HMAC-SHA256 서명 검증 (timing-safe 비교)
 * message = user_id + ts
 */
function verifyHmac(secret: string, userId: string, ts: string, token: string): boolean {
    const message = userId + ts
    const expected = crypto.createHmac('sha256', secret).update(message).digest('hex')
    if (expected.length !== token.length) return false
    try {
        return crypto.timingSafeEqual(
            Buffer.from(expected, 'utf8'),
            Buffer.from(token, 'utf8')
        )
    } catch {
        return false
    }
}

/**
 * 입시내비 → 영단어 앱 SSO 엔트리포인트
 *
 * GET /api/auth/sso?user_id={학생ID}&ts={Unix초}&token={HMAC-SHA256}
 *
 * 처리 순서:
 * 1. HMAC 서명 검증 (위변조 방지)
 * 2. 타임스탬프 5분 유효성 검사 (URL 재사용 방지)
 * 3. Supabase Admin API로 유저 조회 → 없으면 자동 생성
 * 4. Magic Link 발급 → Supabase 세션 쿠키 설정
 * 5. /study 로 리다이렉트
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('user_id')
    const ts = searchParams.get('ts')
    const token = searchParams.get('token')

    // ── 1. 파라미터 필수 체크 ──────────────────────────────────────────
    if (!userId || !ts || !token) {
        return new NextResponse('Missing required parameters: user_id, ts, token', { status: 400 })
    }

    // ── 2. HMAC 서명 검증 ─────────────────────────────────────────────
    const secret = process.env.AUTH_HMAC_SECRET?.trim()
    if (!secret) {
        console.error('AUTH_HMAC_SECRET is not set');
        return new NextResponse('Server configuration error: AUTH_HMAC_SECRET missing', { status: 500 })
    }

    if (!verifyHmac(secret, userId, ts, token)) {
        const message = userId + ts;
        const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');
        console.error(`HMAC Mismatch! \nMsg: ${message}\nExpected: ${expected}\nReceived: ${token}`);
        return new NextResponse(`Invalid signature. Debug: msg=${message}`, { status: 401 })
    }

    // ── 3. 타임스탬프 유효성 (5분 이내) ──────────────────────────────
    const tsNum = parseInt(ts, 10)
    const now = Math.floor(Date.now() / 1000)
    if (isNaN(tsNum) || Math.abs(now - tsNum) > FIVE_MINUTES) {
        return new NextResponse('Token expired (valid for 5 minutes)', { status: 401 })
    }

    // ── 4. Supabase Admin 클라이언트 ──────────────────────────────────
    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── 5. 유저 조회 / 자동 생성 (Auto-provisioning) ──────────────────
    // 이메일 식별자: {user_id}@inputnavi.internal
    const email = `${userId}@inputnavi.internal`

    const { error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { external_id: userId, source: 'inputnavi' },
    })

    // 이미 존재하는 유저는 정상 (already been registered 에러 무시)
    if (createError && !createError.message.includes('already been registered')) {
        console.error('SSO auto-provisioning error:', createError.message)
        return new NextResponse('Failed to provision user', { status: 500 })
    }

    // ── 6. Magic Link 발급 (세션 쿠키 자동 설정) ────────────────────────
    const origin = `${request.nextUrl.protocol}//${request.nextUrl.host}`

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
            redirectTo: `${origin}/auth/callback?next=/study`,
        },
    })

    if (linkError || !linkData?.properties?.action_link) {
        console.error('SSO generateLink error:', linkError?.message)
        return new NextResponse('Failed to generate session', { status: 500 })
    }

    // ── 7. Supabase auth 서버로 리다이렉트 (세션 쿠키 설정 후 /study 이동) ──
    return NextResponse.redirect(linkData.properties.action_link)
}
