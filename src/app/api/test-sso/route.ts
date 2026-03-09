import { NextResponse } from 'next/server'

/**
 * 테스트 전용 라우트 — 프로덕션에서 비활성화
 * 로컬 개발 시에만 사용: NODE_ENV=development
 */
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return new NextResponse('Not found', { status: 404 })
    }

    return new NextResponse(
        'test-sso는 로컬 개발 환경에서만 사용 가능합니다. (NODE_ENV=development)',
        { status: 403 }
    )
}
