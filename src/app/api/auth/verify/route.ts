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
 * 복호화 + 검증 → /auth/loading으로 이동
 * iOS/Android WebView 모두 호환되도록 HTML meta refresh + JS redirect 사용
 */
export async function POST(request: NextRequest) {
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
            return redirectPage(`/auth/loading?error=${encodeURIComponent('비정상 접근입니다.')}&redirect=${encodeURIComponent(IPSI_NAVI_URL)}`)
        }

        const secretKey = process.env.VOCA_SECRET_KEY?.trim()
        if (!secretKey) {
            return redirectPage(`/auth/loading?error=${encodeURIComponent('비정상 접근입니다.')}&redirect=${encodeURIComponent(IPSI_NAVI_URL)}`)
        }

        // 복호화 + 기본 검증
        const encrypted = Buffer.from(payload, 'base64')
        let decrypted: string
        try {
            decrypted = xorDecrypt(encrypted, secretKey)
        } catch {
            return redirectPage(`/auth/loading?error=${encodeURIComponent('비정상 접근입니다.')}&redirect=${encodeURIComponent(IPSI_NAVI_URL)}`)
        }

        const parts = decrypted.split('|')
        if (parts.length < 3) {
            return redirectPage(`/auth/loading?error=${encodeURIComponent('비정상 접근입니다.')}&redirect=${encodeURIComponent(IPSI_NAVI_URL)}`)
        }

        const nid = parts[0]
        const name = parts[1]
        const ts = parseInt(parts[2], 10)

        if (!nid || !name || isNaN(ts)) {
            return redirectPage(`/auth/loading?error=${encodeURIComponent('비정상 접근입니다.')}&redirect=${encodeURIComponent(IPSI_NAVI_URL)}`)
        }

        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - ts) > FIVE_MINUTES) {
            return redirectPage(`/auth/loading?error=${encodeURIComponent('인증 시간이 만료되었습니다.')}&redirect=${encodeURIComponent(IPSI_NAVI_URL)}`)
        }

        // 검증 통과 → 로딩 페이지로 이동
        const params = new URLSearchParams({ payload, name })
        return redirectPage(`/auth/loading?${params.toString()}`)

    } catch (err) {
        console.error('Verify error:', err)
        const ipsi = process.env.IPSI_NAVI_URL || 'https://ipsinavi.com'
        return redirectPage(`/auth/loading?error=${encodeURIComponent('비정상 접근입니다.')}&redirect=${encodeURIComponent(ipsi)}`)
    }
}

/** 최소 HTML로 페이지 이동 — iOS/Android WebView 모두 호환 */
function redirectPage(url: string) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${url}"></head><body><script>location.replace("${url}")</script></body></html>`
    return new NextResponse(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': 'inline',
        },
    })
}
