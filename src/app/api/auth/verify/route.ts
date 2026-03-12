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
 * POST /api/auth/verify
 *
 * 복호화 + 검증 → 303 redirect to /auth/loading
 * WebView 호환성을 위해 HTML 직접 반환 대신 PRG 패턴 사용
 */
export async function POST(request: NextRequest) {
    const baseUrl = request.nextUrl.origin
    const IPSI_NAVI_URL = process.env.IPSI_NAVI_URL || 'https://ipsinavi.com'

    try {
        const contentType = request.headers.get('content-type') || ''
        let payload: string | null = null

        if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData()
            payload = formData.get('payload') as string
        } else {
            const body = await request.json()
            payload = body.payload
        }

        if (!payload) {
            return errorRedirect(baseUrl, '비정상 접근입니다.', IPSI_NAVI_URL)
        }

        const secretKey = process.env.VOCA_SECRET_KEY?.trim()
        if (!secretKey) {
            return errorRedirect(baseUrl, '비정상 접근입니다.', IPSI_NAVI_URL)
        }

        // 복호화 + 기본 검증
        const encrypted = Buffer.from(payload, 'base64')
        let decrypted: string
        try {
            decrypted = xorDecrypt(encrypted, secretKey)
        } catch {
            return errorRedirect(baseUrl, '비정상 접근입니다.', IPSI_NAVI_URL)
        }

        const parts = decrypted.split('|')
        if (parts.length < 3) {
            return errorRedirect(baseUrl, '비정상 접근입니다.', IPSI_NAVI_URL)
        }

        const nid = parts[0]
        const name = parts[1]
        const ts = parseInt(parts[2], 10)

        if (!nid || !name || isNaN(ts)) {
            return errorRedirect(baseUrl, '비정상 접근입니다.', IPSI_NAVI_URL)
        }

        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - ts) > FIVE_MINUTES) {
            return errorRedirect(baseUrl, '인증 시간이 만료되었습니다.', IPSI_NAVI_URL)
        }

        // 검증 통과 → 로딩 페이지로 redirect (PRG 패턴)
        const params = new URLSearchParams({ payload, name })
        return NextResponse.redirect(
            `${baseUrl}/auth/loading?${params.toString()}`,
            303
        )

    } catch (err) {
        console.error('Verify error:', err)
        return errorRedirect(
            request.nextUrl.origin,
            '비정상 접근입니다.',
            process.env.IPSI_NAVI_URL || 'https://ipsinavi.com'
        )
    }
}

/** 에러 시 로딩 페이지로 redirect (alert 표시 후 입시내비로 이동) */
function errorRedirect(baseUrl: string, message: string, redirectUrl: string) {
    const params = new URLSearchParams({ error: message, redirect: redirectUrl })
    return NextResponse.redirect(
        `${baseUrl}/auth/loading?${params.toString()}`,
        303
    )
}
