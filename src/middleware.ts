import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase 세션 쿠키 갱신 미들웨어 (표준 @supabase/ssr 패턴)
 * SSO 인증 자체는 /api/auth/sso Route Handler에서 처리합니다.
 */
export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setAll(cookiesToSet: any[]) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    cookiesToSet.forEach(({ name, value }: any) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    cookiesToSet.forEach(({ name, value, options }: any) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    await supabase.auth.getUser()

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
