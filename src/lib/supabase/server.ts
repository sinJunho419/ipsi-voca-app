import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 서버 컴포넌트 / Server Actions / Route Handlers에서 사용하는 Supabase 클라이언트
 */
export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setAll(cookiesToSet: any[]) {
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        cookiesToSet.forEach(({ name, value, options }: any) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // 서버 컴포넌트에서 호출 시 쿠키 설정은 무시됨
                    }
                },
            },
        }
    )
}
