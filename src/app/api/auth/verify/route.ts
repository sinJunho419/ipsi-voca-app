import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const FIVE_MINUTES = 5 * 60

/**
 * 입시내비 → 입시보카 인증
 *
 * POST /api/auth/verify
 * Body: payload=Base64(XOR(nid|name|timestamp, secretKey))
 *
 * 암호화 방식: XOR + Base64 (Classic ASP 순수 VBScript 호환)
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
            return errorPage('잘못된 요청입니다.', IPSI_NAVI_URL)
        }

        // ── 2. XOR 복호화 ────────────────────────────────────────────
        const secretKey = process.env.VOCA_SECRET_KEY?.trim()
        if (!secretKey) {
            console.error('VOCA_SECRET_KEY is not set')
            return errorPage('서버 설정 오류입니다.', IPSI_NAVI_URL)
        }

        const encrypted = Buffer.from(payload, 'base64')
        let decrypted: string
        try {
            decrypted = xorDecrypt(encrypted, secretKey)
        } catch {
            return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
        }

        // ── 3. 복호화된 데이터 파싱: nid|name|timestamp ──────────────
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
            // nid|timestamp를 같은 시크릿 키로 XOR 암호화해서 전송
            const verifyPayload = xorEncryptToBase64(`${nid}|${now}`, secretKey)

            const res = await fetch(verifyApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payload: verifyPayload }),
            })

            if (!res.ok) {
                throw new Error(`입시내비 API responded ${res.status}`)
            }

            const data = await res.json()
            // 응답: { status: "active" | "inactive" | "fail01~04" | "Time Over" }
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
                'Time Over': '인증 시간이 만료되었습니다.',
            }
            const statusMsg = errorMessages[memberStatus] || '비정상 접근입니다.'
            console.error('입시내비 회원 상태 확인 실패:', memberStatus)
            return errorPage(statusMsg, IPSI_NAVI_URL)
        }

        // ── 7. Supabase 유저 생성/조회 ───────────────────────────────
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const email = `nid_${nid}@inputnavi.internal`
        const displayName = name || `학생_${nid}`

        const { error: createError } = await adminClient.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: {
                nid,
                sname: displayName,
                source: 'inputnavi',
            },
        })

        if (createError && !createError.message.includes('already been registered')) {
            console.error('User provisioning error:', createError.message)
            return errorPage('사용자 등록에 실패했습니다.', IPSI_NAVI_URL)
        }

        // 기존 유저: 이름 최신화
        if (createError?.message.includes('already been registered')) {
            const { data: users } = await adminClient.auth.admin.listUsers()
            const existingUser = users?.users?.find(u => u.email === email)
            if (existingUser) {
                await adminClient.auth.admin.updateUserById(existingUser.id, {
                    user_metadata: { ...existingUser.user_metadata, sname: displayName },
                })
                await adminClient.from('profiles').upsert(
                    { id: existingUser.id, name: displayName },
                    { onConflict: 'id' }
                )
            }
        } else {
            // 신규 유저: profiles에 이름 저장
            const { data: users } = await adminClient.auth.admin.listUsers()
            const newUser = users?.users?.find(u => u.email === email)
            if (newUser) {
                await adminClient.from('profiles').upsert(
                    { id: newUser.id, name: displayName },
                    { onConflict: 'id' }
                )
            }
        }

        // ── 8. Magic Link → 서버에서 직접 세션 설정 ──────────────────
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
            type: 'magiclink',
            email,
        })

        if (linkError || !linkData?.properties?.hashed_token) {
            console.error('generateLink error:', linkError?.message)
            return errorPage('세션 생성에 실패했습니다.', IPSI_NAVI_URL)
        }

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

        const { error: otpError } = await serverClient.auth.verifyOtp({
            token_hash: linkData.properties.hashed_token,
            type: 'email',
        })

        if (otpError) {
            console.error('verifyOtp error:', otpError.message)
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

/** 디버그용 GET 핸들러 - 라우트 존재 확인 */
export async function GET(request: NextRequest) {
    const url = request.url
    const method = request.method
    const headers = Object.fromEntries(request.headers.entries())

    return new NextResponse(JSON.stringify({
        ok: true,
        message: 'verify 라우트 정상 동작',
        url,
        method,
        timestamp: new Date().toISOString(),
        env: {
            VOCA_SECRET_KEY: process.env.VOCA_SECRET_KEY ? '설정됨' : '미설정',
            SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '설정됨' : '미설정',
        },
        headers: {
            'content-type': headers['content-type'] || 'none',
            'user-agent': headers['user-agent'] || 'none',
        },
    }, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })
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
