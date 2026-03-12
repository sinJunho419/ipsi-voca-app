import { NextRequest, NextResponse } from 'next/server'

const FIVE_MINUTES = 5 * 60

/** XOR 복호화 */
function xorDecrypt(encrypted: Buffer, key: string): string {
    const keyBytes = Buffer.from(key, 'utf8')
    const result = Buffer.alloc(encrypted.length)
    for (let i = 0; i < encrypted.length; i++) {
        result[i] = encrypted[i] ^ keyBytes[i % keyBytes.length]
    }
    return result.toString('utf8')
}

/**
 * GET /api/auth/verify?payload=xxx
 *
 * 단순 URL 이동 방식 — WebView 내부에서 주소창 없이 동작
 * iPhone/Android 모두 호환
 */
export async function GET(request: NextRequest) {
    const payload = request.nextUrl.searchParams.get('payload')
    return handleVerify(payload, request.nextUrl.origin)
}

/** POST도 하위 호환을 위해 유지 */
export async function POST(request: NextRequest) {
    const contentType = request.headers.get('content-type') || ''
    let payload: string | null = null

    try {
        if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData()
            payload = formData.get('payload') as string
        } else {
            const body = await request.json()
            payload = body.payload
        }
    } catch {
        payload = null
    }

    return handleVerify(payload, request.nextUrl.origin)
}

/** 공통 검증 로직 */
function handleVerify(payload: string | null, origin: string) {
    const IPSI_NAVI_URL = process.env.IPSI_NAVI_URL || 'https://ipsinavi.com'

    try {
        if (!payload) {
            return errorRedirect('비정상 접근입니다.', IPSI_NAVI_URL, origin)
        }

        const secretKey = process.env.VOCA_SECRET_KEY?.trim()
        if (!secretKey) {
            return errorRedirect('비정상 접근입니다.', IPSI_NAVI_URL, origin)
        }

        const encrypted = Buffer.from(payload, 'base64')
        let decrypted: string
        try {
            decrypted = xorDecrypt(encrypted, secretKey)
        } catch {
            return errorRedirect('비정상 접근입니다.', IPSI_NAVI_URL, origin)
        }

        const parts = decrypted.split('|')
        if (parts.length < 3) {
            return errorRedirect('비정상 접근입니다.', IPSI_NAVI_URL, origin)
        }

        const nid = parts[0]
        const name = parts[1]
        const ts = parseInt(parts[2], 10)

        if (!nid || !name || isNaN(ts)) {
            return errorRedirect('비정상 접근입니다.', IPSI_NAVI_URL, origin)
        }

        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - ts) > FIVE_MINUTES) {
            return errorRedirect('인증 시간이 만료되었습니다.', IPSI_NAVI_URL, origin)
        }

        // 검증 통과 → 로딩 페이지로 redirect
        const params = new URLSearchParams({ payload, name })
        return NextResponse.redirect(`${origin}/auth/loading?${params.toString()}`, 302)

    } catch (err) {
        console.error('Verify error:', err)
        return errorRedirect('비정상 접근입니다.', IPSI_NAVI_URL, origin)
    }
}

/** 에러 시 로딩 페이지로 redirect */
function errorRedirect(message: string, redirectUrl: string, origin: string) {
    const params = new URLSearchParams({ error: message, redirect: redirectUrl })
    return NextResponse.redirect(`${origin}/auth/loading?${params.toString()}`, 302)
}
