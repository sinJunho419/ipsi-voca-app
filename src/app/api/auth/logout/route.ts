import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 입시내비 Classic ASP → 영단어 앱 로그아웃 콜백
 *
 * POST /api/auth/logout
 * Body: { nid: string, secret: string }
 *
 * 입시내비에서 로그아웃 시 이 API를 호출하면
 * 해당 nid의 Supabase 세션을 무효화합니다.
 */
export async function POST(request: NextRequest) {
    const body = await request.json()
    const { nid, secret } = body

    // ── 1. 파라미터 확인 ──
    if (!nid || !secret) {
        return NextResponse.json({ error: 'Missing nid or secret' }, { status: 400 })
    }

    // ── 2. 공유 시크릿 검증 (입시내비 서버만 호출 가능) ──
    const expectedSecret = process.env.IPSI_NAVI_LOGOUT_SECRET
    if (!expectedSecret || secret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 3. Supabase Admin 클라이언트 ──
    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── 4. nid로 유저 찾기 ──
    const email = `nid_${nid}@inputnavi.internal`
    const { data: users } = await adminClient.auth.admin.listUsers()
    const user = users?.users?.find(u => u.email === email)

    if (!user) {
        // 유저가 없어도 OK 응답 (이미 없거나 한 번도 접속 안 한 경우)
        return NextResponse.json({ ok: true, message: 'User not found, nothing to do' })
    }

    // ── 5. 해당 유저의 모든 세션 무효화 ──
    await adminClient.auth.admin.signOut(user.id, 'global')

    return NextResponse.json({ ok: true })
}
