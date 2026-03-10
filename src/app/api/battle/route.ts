import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Service-role 기반 배틀 API
 * 인증된 유저 우선, 비로그인 시 클라이언트가 보낸 guestId 사용
 */
const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

/** 누락 컬럼 자동 추가 + PostgREST 스키마 캐시 갱신 (서버 시작 후 최초 1회) */
let schemaMigrated = false

async function ensureSchema() {
    if (schemaMigrated) return

    try {
        // @ts-expect-error — supabase-js v2.43+ supports .sql tagged template
        await admin.sql`
            ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS participant_ids uuid[] DEFAULT '{}';
            ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS max_players integer DEFAULT 50;
            ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS question_ids integer[];
            ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS finished_at timestamptz;
            ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'normal';
            ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS question_count integer NOT NULL DEFAULT 10;
            NOTIFY pgrst, 'reload schema';
        `
        schemaMigrated = true
    } catch {
        schemaMigrated = true
    }
}

/** 세션에서 인증된 유저 ID를 가져옴 */
async function getAuthUserId(): Promise<string | null> {
    try {
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        return user?.id ?? null
    } catch {
        return null
    }
}

export async function POST(request: NextRequest) {
    await ensureSchema()

    const body = await request.json()
    const { action } = body

    // 인증: 로그인 유저 우선, 없으면 클라이언트가 보낸 hostId(게스트 ID) 사용
    const authUserId = await getAuthUserId() || body.hostId || body.userId
    if (!authUserId) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // ── 방 생성 ──
    if (action === 'create') {
        const { roomCode, level, setNo, questionIds, questionCount } = body

        const { data, error } = await admin
            .from('battle_rooms')
            .insert({
                room_code: roomCode,
                host_id: authUserId,
                participant_ids: [authUserId],
                max_players: 50,
                level,
                set_no: setNo,
                status: 'waiting',
                question_ids: questionIds,
                question_count: questionCount,
            })
            .select('id')
            .single()

        if (error) {
            if (error.message?.includes('schema cache') || error.message?.includes('column')) {
                schemaMigrated = false
            }
            return NextResponse.json({ error: error.message || 'Failed to create room' }, { status: 400 })
        }

        return NextResponse.json({ id: data.id })
    }

    // ── 방 입장 ──
    if (action === 'join') {
        const { roomId } = body

        const { data: room } = await admin
            .from('battle_rooms')
            .select('*')
            .eq('id', roomId)
            .single()

        if (!room) {
            return NextResponse.json({ error: '방을 찾을 수 없습니다.' }, { status: 404 })
        }

        if (room.status !== 'waiting') {
            return NextResponse.json({ error: '이미 게임이 진행 중입니다.' }, { status: 400 })
        }

        const participants = room.participant_ids || []
        if (participants.includes(authUserId)) {
            return NextResponse.json({ ok: true })
        }

        const maxPlayers = room.max_players || 50
        if (participants.length >= maxPlayers) {
            return NextResponse.json({ error: '방이 가득 찼습니다.' }, { status: 400 })
        }

        const { error } = await admin
            .from('battle_rooms')
            .update({ participant_ids: [...participants, authUserId] })
            .eq('id', roomId)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ ok: true })
    }

    // ── 배틀 시작 (호스트만 가능) ──
    if (action === 'start') {
        const { roomId } = body

        const { data: room } = await admin
            .from('battle_rooms')
            .select('host_id')
            .eq('id', roomId)
            .single()

        if (!room || room.host_id !== authUserId) {
            return NextResponse.json({ error: '호스트만 시작할 수 있습니다.' }, { status: 403 })
        }

        const { error } = await admin
            .from('battle_rooms')
            .update({ status: 'playing' })
            .eq('id', roomId)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ ok: true })
    }

    // ── 방 나가기 ──
    if (action === 'leave') {
        const { roomId } = body

        const { data: room } = await admin
            .from('battle_rooms')
            .select('host_id, participant_ids')
            .eq('id', roomId)
            .single()

        if (!room) {
            return NextResponse.json({ ok: true })
        }

        const remaining = (room.participant_ids || []).filter((id: string) => id !== authUserId)

        if (remaining.length === 0) {
            await admin.from('battle_rooms').delete().eq('id', roomId)
        } else {
            const newHost = room.host_id === authUserId ? remaining[0] : room.host_id
            await admin
                .from('battle_rooms')
                .update({ participant_ids: remaining, host_id: newHost })
                .eq('id', roomId)
        }

        return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
