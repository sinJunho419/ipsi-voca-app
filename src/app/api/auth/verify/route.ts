import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const FIVE_MINUTES = 5 * 60

// 모듈 레벨에서 1회만 생성 (매 요청마다 재생성 방지)
const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * 입시내비 → 입시보카 인증
 *
 * POST /api/auth/verify
 * Body: payload=Base64(XOR(UTF8(nid|name|timestamp), UTF8(secretKey)))
 *
 * 암호화 방식: UTF-8 바이트 단위 XOR + Base64 (Classic ASP 순수 VBScript 호환)
 *
 * 흐름:
 * 1. Base64 디코딩 → XOR 복호화
 * 2. 타임스탬프 유효성 검증 (5분)
 * 3. 입시내비 API 호출 → 회원 상태 확인
 * 4. Supabase 유저 생성/조회 + 세션 설정
 * 5. 정상 → /study 리다이렉트
 * 6. 비정상 → 경고 + 입시내비로 리다이렉트
 */

/** XOR 복호화 */
function xorDecrypt(encrypted: Buffer, key: string): string {
    const keyBytes = Buffer.from(key, 'utf8')
    const result = Buffer.alloc(encrypted.length)
    for (let i = 0; i < encrypted.length; i++) {
        result[i] = encrypted[i] ^ keyBytes[i % keyBytes.length]
    }
    return result.toString('utf8')
}

/** XOR 암호화 → Base64 (입시내비 API 호출용) */
function xorEncryptToBase64(plaintext: string, key: string): string {
    const textBytes = Buffer.from(plaintext, 'utf8')
    const keyBytes = Buffer.from(key, 'utf8')
    const result = Buffer.alloc(textBytes.length)
    for (let i = 0; i < textBytes.length; i++) {
        result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length]
    }
    return result.toString('base64')
}

export async function POST(request: NextRequest) {
    const IPSI_NAVI_URL = process.env.IPSI_NAVI_URL || 'https://ipsinavi.com'

    try {
        // ── 1. payload 추출 ──────────────────────────────────────────
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
            console.error('VOCA_SECRET_KEY 미설정')
            return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
        }

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

        // ── 4. 타임스탬프 유효성 (5분) ───────────────────────────────
        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - ts) > FIVE_MINUTES) {
            return errorPage('인증 시간이 만료되었습니다.', IPSI_NAVI_URL)
        }

        // ── 5. 입시내비 API 호출 → 회원 상태 확인 ────────────────────
        const verifyApiUrl = 'https://m.ipsinavi.com/ipsivoca_Api.asp'

        let memberStatus: string
        try {
            const verifyPayload = xorEncryptToBase64(decrypted, secretKey)

            const res = await fetch(verifyApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `payload=${encodeURIComponent(verifyPayload)}`,
            })

            if (!res.ok) {
                throw new Error(`입시내비 API responded ${res.status}`)
            }

            const data = await res.json()
            memberStatus = data.status
        } catch (err) {
            console.error('입시내비 API call failed:', err)
            return errorPage('회원 정보를 확인할 수 없습니다.', IPSI_NAVI_URL)
        }

        // ── 6. 상태 판별 ─────────────────────────────────────────────
        if (memberStatus !== 'active') {
            const errorMessages: Record<string, string> = {
                'inactive': '미사용 상태의 회원입니다.',
                'fail01': '인증 처리 중 오류가 발생했습니다.',
                'fail02': '인증 처리 중 오류가 발생했습니다.',
                'fail03': '인증 처리 중 오류가 발생했습니다.',
                'fail04': '인증 처리 중 오류가 발생했습니다.',
                'fail05': '인증 처리 중 오류가 발생했습니다.',
                'Time Over': '인증 시간이 만료되었습니다.',
                'Empty': '등록되지 않은 회원입니다.',
            }
            const statusMsg = errorMessages[memberStatus] || '비정상 접근입니다.'
            console.error('입시내비 회원 상태 확인 실패:', memberStatus)
            return errorPage(statusMsg, IPSI_NAVI_URL)
        }

        // ── 7. Supabase 유저 생성 + Magic Link 생성 ────────────────────
        const email = `nid_${nid}@inputnavi.internal`
        const displayName = name || `학생_${nid}`

        // 유저 생성 시도 (이미 있으면 무시)
        await adminClient.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: {
                nid,
                sname: displayName,
                source: 'inputnavi',
            },
        })

        // Magic Link 생성 (유저 정보도 함께 리턴됨)
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
            type: 'magiclink',
            email,
        })

        if (linkError || !linkData?.properties?.hashed_token) {
            console.error('generateLink error:', linkError?.message)
            return errorPage('세션 생성에 실패했습니다.', IPSI_NAVI_URL)
        }

        // ── 8. 프로필 업데이트 + 세션 설정 (병렬 실행) ──────────────
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

        // 프로필 업데이트 2개 + OTP 검증을 병렬 실행
        const [,, otpResult] = await Promise.all([
            adminClient.auth.admin.updateUserById(userId, {
                user_metadata: { nid, sname: displayName, source: 'inputnavi' },
            }),
            adminClient.from('profiles').upsert(
                { id: userId, name: displayName },
                { onConflict: 'id' }
            ),
            serverClient.auth.verifyOtp({
                token_hash: linkData.properties.hashed_token,
                type: 'email',
            }),
        ])

        if (otpResult.error) {
            console.error('verifyOtp error:', otpResult.error.message)
            return errorPage('세션 설정에 실패했습니다.', IPSI_NAVI_URL)
        }

        // ── 9. /study 리다이렉트 (Supabase 세션 쿠키 이미 설정됨) ────
        const origin = `${request.nextUrl.protocol}//${request.nextUrl.host}`
        return NextResponse.redirect(`${origin}/study`)

    } catch (err) {
        console.error('Verify error:', err)
        return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
    }
}

/** 경고창 + 입시내비로 리다이렉트하는 HTML 응답 */
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
