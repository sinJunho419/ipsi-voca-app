import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * 테스트 전용 라우트
 * GET /api/test-sso?user_id=test1
 * -> 서버의 AUTH_HMAC_SECRET를 읽어 유효한 SSO URL을 생성하고 자동 리다이렉트합니다.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('user_id') || 'test_user_999'

    const secret = process.env.AUTH_HMAC_SECRET
    if (!secret) {
        return new NextResponse('Vercel에 AUTH_HMAC_SECRET 환경변수가 설정되지 않았습니다.', { status: 500 })
    }

    const ts = Math.floor(Date.now() / 1000).toString()
    const payload = userId + ts
    const token = crypto.createHmac('sha256', secret).update(payload).digest('hex')

    // 생성한 유효한 SSO URL로 바로 리다이렉트!
    const ssoUrl = new URL(`/api/auth/sso?user_id=${userId}&ts=${ts}&token=${token}`, request.url)
    return NextResponse.redirect(ssoUrl)
}
