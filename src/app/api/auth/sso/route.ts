import { NextRequest, NextResponse } from 'next/server'

/**
 * 레거시 SSO 엔트리포인트 — /api/auth/auto로 리다이렉트
 *
 * 기존 /sso 페이지에서 호출하던 경로를 유지하면서
 * 실제 처리는 /api/auth/auto에서 합니다.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const origin = `${request.nextUrl.protocol}//${request.nextUrl.host}`

    const url = new URL('/api/auth/auto', origin)
    searchParams.forEach((value, key) => url.searchParams.set(key, value))

    return NextResponse.redirect(url.toString())
}
