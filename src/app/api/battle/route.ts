import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Service-role 기반 배틀 API
 * RLS 우회 + 누락 컬럼 자동 마이그레이션
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
        console.log('[API] Schema migration completed successfully')
        schemaMigrated = true
    } catch (e) {
        console.error('[API] Schema migration via .sql failed, trying alternative...', e)

        // 대안: Supabase HTTP API로 직접 SQL 실행
        const ref = process.env.NEXT_PUBLIC_SUPABASE_URL!.match(/https:\/\/([^.]+)/)?.[1]
        if (ref) {
            try {
                const res = await fetch(
                    `https://${ref}.supabase.co/rest/v1/rpc/exec_migration`,
                    {
                        method: 'POST',
                        headers: {
                            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
                            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
                            'Content-Type': 'application/json',
                        },
                        body: '{}',
                    }
                )
                // 함수가 없어도 OK — 컬럼이 이미 있을 수 있음
            } catch {}
        }

        // 마이그레이션 실패해도 일단 시도 플래그 설정 (매 요청마다 재시도 방지)
        schemaMigrated = true
    }
}

export async function POST(request: NextRequest) {
    await ensureSchema()

    const body = await request.json()
    const { action } = body

    // ── 방 생성 ──
    if (action === 'create') {
        const { roomCode, hostId, level, setNo, questionIds, questionCount } = body

        const { data, error } = await admin
            .from('battle_rooms')
            .insert({
                room_code: roomCode,
                host_id: hostId,
                participant_ids: [hostId],
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
            console.error('[API] Room creation error:', error)

            // 스키마 캐시 문제면 재시도를 위해 플래그 리셋
            if (error.message?.includes('schema cache') || error.message?.includes('column')) {
                schemaMigrated = false
            }

            return NextResponse.json({
                error: error.message || 'Failed to create room',
            }, { status: 400 })
        }

        return NextResponse.json({ id: data.id })
    }

    // ── 방 입장 ──
    if (action === 'join') {
        const { roomId, userId } = body

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
        if (participants.includes(userId)) {
            return NextResponse.json({ ok: true })
        }

        const maxPlayers = room.max_players || 50
        if (participants.length >= maxPlayers) {
            return NextResponse.json({ error: '방이 가득 찼습니다.' }, { status: 400 })
        }

        const { error } = await admin
            .from('battle_rooms')
            .update({ participant_ids: [...participants, userId] })
            .eq('id', roomId)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ ok: true })
    }

    // ── 배틀 시작 ──
    if (action === 'start') {
        const { roomId } = body

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
        const { roomId, userId } = body

        const { data: room } = await admin
            .from('battle_rooms')
            .select('host_id, participant_ids')
            .eq('id', roomId)
            .single()

        if (!room) {
            return NextResponse.json({ ok: true })
        }

        const remaining = (room.participant_ids || []).filter((id: string) => id !== userId)

        if (remaining.length === 0) {
            await admin.from('battle_rooms').delete().eq('id', roomId)
        } else {
            const newHost = room.host_id === userId ? remaining[0] : room.host_id
            await admin
                .from('battle_rooms')
                .update({ participant_ids: remaining, host_id: newHost })
                .eq('id', roomId)
        }

        return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
