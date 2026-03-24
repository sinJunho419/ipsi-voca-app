import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

/**
 * Supabase HTTP 프록시
 * HTTPS 배포 환경에서 HTTP Supabase 호출 시 Mixed Content 차단 우회
 * 모든 REST/Auth/Storage 요청을 서버에서 중계
 */
async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params
    const targetPath = path.join('/')
    const url = new URL(request.url)
    const targetUrl = `${SUPABASE_URL}/${targetPath}${url.search}`

    const headers = new Headers()
    // 필요한 헤더만 전달
    for (const key of ['apikey', 'authorization', 'content-type', 'prefer', 'x-client-info', 'range']) {
        const val = request.headers.get(key)
        if (val) headers.set(key, val)
    }

    try {
        const res = await fetch(targetUrl, {
            method: request.method,
            headers,
            body: request.method !== 'GET' && request.method !== 'HEAD'
                ? await request.text()
                : undefined,
        })

        const responseHeaders = new Headers()
        // 응답 헤더 전달
        for (const key of ['content-type', 'content-range', 'x-total-count', 'preference-applied']) {
            const val = res.headers.get(key)
            if (val) responseHeaders.set(key, val)
        }
        // CORS 허용
        responseHeaders.set('access-control-allow-origin', '*')

        const body = await res.arrayBuffer()
        return new NextResponse(body, {
            status: res.status,
            statusText: res.statusText,
            headers: responseHeaders,
        })
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Proxy error' },
            { status: 502 }
        )
    }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'access-control-allow-headers': 'apikey, authorization, content-type, prefer, x-client-info, range',
        },
    })
}
