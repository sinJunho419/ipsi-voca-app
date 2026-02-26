import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = request.nextUrl
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/study'

    if (code) {
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
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

        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        }

        console.error('Auth callback error:', error.message)
    }

    return NextResponse.redirect(`${origin}/study?error=auth_failed`)
}
