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
 * POST /api/auth/verify/session
 *
 * 2단계: 실제 인증 처리 (로딩 화면의 JS가 호출)
 * - 입시내비 API 회원 확인
 * - Supabase 유저 생성/조회 + 세션 설정
 */
export async function POST(request: NextRequest) {
    try {
        const { payload } = await request.json()

        if (!payload) {
            return NextResponse.json({ ok: false, error: '비정상 접근입니다.' })
        }

        const secretKey = process.env.VOCA_SECRET_KEY?.trim()
        if (!secretKey) {
            return NextResponse.json({ ok: false, error: '비정상 접근입니다.' })
        }

        // 복호화
        const encrypted = Buffer.from(payload, 'base64')
        const decrypted = xorDecrypt(encrypted, secretKey)
        const parts = decrypted.split('|')

        if (parts.length < 3) {
            return NextResponse.json({ ok: false, error: '비정상 접근입니다.' })
        }

        const nid = parts[0]
        const name = parts[1]
        const ts = parseInt(parts[2], 10)

        if (!nid || !name || isNaN(ts)) {
            return NextResponse.json({ ok: false, error: '비정상 접근입니다.' })
        }

        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - ts) > FIVE_MINUTES) {
            return NextResponse.json({ ok: false, error: '인증 시간이 만료되었습니다.' })
        }

        // ── 입시내비 API + Supabase 유저 생성 병렬 ──────────────────
        const verifyPayload = xorEncryptToBase64(decrypted, secretKey)
        const email = `nid_${nid}@inputnavi.internal`
        const displayName = name || `학생_${nid}`

        const [apiResult] = await Promise.all([
            fetch('https://m.ipsinavi.com/ipsivoca_Api.asp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `payload=${encodeURIComponent(verifyPayload)}`,
            }).then(async res => {
                if (!res.ok) throw new Error(`API responded ${res.status}`)
                return res.json()
            }).catch(err => {
                console.error('입시내비 API call failed:', err)
                return { status: '__error__' }
            }),
            adminClient.auth.admin.createUser({
                email,
                email_confirm: true,
                user_metadata: { nid, sname: displayName, source: 'inputnavi' },
            }),
        ])

        // 상태 판별
        const memberStatus = apiResult.status
        if (memberStatus !== 'active') {
            const errorMessages: Record<string, string> = {
                '__error__': '회원 정보를 확인할 수 없습니다.',
                'inactive': '미사용 상태의 회원입니다.',
                'fail01': '인증 처리 중 오류가 발생했습니다.',
                'fail02': '인증 처리 중 오류가 발생했습니다.',
                'fail03': '인증 처리 중 오류가 발생했습니다.',
                'fail04': '인증 처리 중 오류가 발생했습니다.',
                'fail05': '인증 처리 중 오류가 발생했습니다.',
                'Time Over': '인증 시간이 만료되었습니다.',
                'Empty': '등록되지 않은 회원입니다.',
            }
            return NextResponse.json({
                ok: false,
                error: errorMessages[memberStatus] || '비정상 접근입니다.',
            })
        }

        // ── Magic Link + 세션 설정 ──────────────────────────────────
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
            type: 'magiclink',
            email,
        })

        if (linkError || !linkData?.properties?.hashed_token) {
            console.error('generateLink error:', linkError?.message)
            return NextResponse.json({ ok: false, error: '세션 생성에 실패했습니다.' })
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

        // 프로필 업데이트 + OTP 검증 병렬
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
            return NextResponse.json({ ok: false, error: '세션 설정에 실패했습니다.' })
        }

        return NextResponse.json({ ok: true, redirect: '/study' })

    } catch (err) {
        console.error('Session error:', err)
        return NextResponse.json({ ok: false, error: '비정상 접근입니다.' })
    }
}
