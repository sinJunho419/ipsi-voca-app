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
 * POST /api/auth/verify
 *
 * 1단계 완결: 복호화 → 검증 → 세션 생성 → 302 redirect to /study
 * HTML 반환 없음 (iPhone WebView에서 다운로드로 처리되는 문제 방지)
 *
 * 최적화:
 * - 입시내비 API: fire-and-forget
 * - generateLink 먼저 시도 (재방문 유저 fast path)
 * - updateUser, profiles upsert: fire-and-forget
 * - verifyOtp만 await
 */
export async function POST(request: NextRequest) {
    const IPSI_NAVI_URL = process.env.IPSI_NAVI_URL || 'https://ipsinavi.com'
    const t0 = Date.now()

    try {
        // ── payload 추출 ──
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
            return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
        }

        const secretKey = process.env.VOCA_SECRET_KEY?.trim()
        if (!secretKey) {
            return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
        }

        // ── 복호화 + 검증 ──
        const encrypted = Buffer.from(payload, 'base64')
        let decrypted: string
        try {
            decrypted = xorDecrypt(encrypted, secretKey)
        } catch {
            return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
        }

        const parts = decrypted.split('|')
        if (parts.length < 3) {
            return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
        }

        const nid = parts[0]
        const name = parts[1]
        const ts = parseInt(parts[2], 10)

        if (!nid || !name || isNaN(ts)) {
            return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
        }

        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - ts) > FIVE_MINUTES) {
            return errorPage('인증 시간이 만료되었습니다.', IPSI_NAVI_URL)
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
            return errorPage('세션 생성에 실패했습니다.', IPSI_NAVI_URL)
        }

        const userId = linkData.user.id
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
            return errorPage('세션 설정에 실패했습니다.', IPSI_NAVI_URL)
        }

        // ── fire-and-forget: updateUser, profiles upsert ──
        adminClient.auth.admin.updateUserById(userId, {
            user_metadata: { nid, sname: displayName, source: 'inputnavi' },
        }).catch(() => {})

        Promise.resolve(
            adminClient.from('profiles').upsert(
                { id: userId, name: displayName },
                { onConflict: 'id' }
            )
        ).catch(() => {})

        console.log(`[auth] ${nid} 완료 +${Date.now() - t0}ms`)

        // ── 302 redirect to /study (HTML 반환 X → iPhone 호환) ──
        const origin = `${request.nextUrl.protocol}//${request.nextUrl.host}`
        const response = NextResponse.redirect(`${origin}/study`, 302)
        response.cookies.set('welcome_name', displayName, {
            maxAge: 30,
            path: '/',
            httpOnly: false,
        })
        return response

    } catch (err) {
        console.error('Verify error:', err)
        return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
    }
}

/** 에러: 경고창 + 입시내비로 이동 */
function errorPage(message: string, redirectUrl: string) {
    const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>입시보카</title></head>
<body>
<script>
  alert("${message}");
  window.location.href = "${redirectUrl}";
</script>
</body>
</html>`

    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
}
