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
            -- battle_rooms: uuid → bigint 마이그레이션 (조건부)
            DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='battle_rooms'
                      AND column_name='host_id' AND udt_name='uuid'
                ) THEN
                    ALTER TABLE public.battle_rooms
                        ALTER COLUMN host_id TYPE bigint USING NULL,
                        ALTER COLUMN guest_id TYPE bigint USING NULL;
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='battle_rooms'
                      AND column_name='participant_ids' AND udt_name='_uuid'
                ) THEN
                    ALTER TABLE public.battle_rooms
                        ALTER COLUMN participant_ids TYPE bigint[] USING '{}';
                END IF;

                -- battle_history: uuid → bigint
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='battle_history'
                      AND column_name='winner_id' AND udt_name='uuid'
                ) THEN
                    ALTER TABLE public.battle_history
                        ALTER COLUMN winner_id TYPE bigint USING NULL;
                END IF;
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='battle_history'
                      AND column_name='participants_ids' AND udt_name='_uuid'
                ) THEN
                    ALTER TABLE public.battle_history
                        ALTER COLUMN participants_ids TYPE bigint[] USING '{}';
                END IF;

                -- battle_participants: uuid → bigint
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='battle_participants'
                      AND column_name='user_id' AND udt_name='uuid'
                ) THEN
                    ALTER TABLE public.battle_participants
                        ALTER COLUMN user_id TYPE bigint USING NULL;
                END IF;
            END $$;

            ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS participant_ids bigint[] DEFAULT '{}';
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

/** 세션에서 인증된 유저 ID(login_info_id)를 가져옴 */
async function getAuthUserId(): Promise<number | null> {
    try {
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        const loginInfoId = user?.user_metadata?.login_info_id
        return typeof loginInfoId === 'number' ? loginInfoId : null
    } catch {
        return null
    }
}

export async function POST(request: NextRequest) {
    await ensureSchema()

    const body = await request.json()
    const { action } = body

    // ── 인증 불필요 액션 ──

    // 세트 목록 조회 (service role → RLS 우회)
    if (action === 'sets') {
        const { level } = body
        if (!level) return NextResponse.json({ error: 'level required' }, { status: 400 })

        const { data, error } = await admin
            .from('words')
            .select('set_no, type')
            .eq('level', level)
            .order('set_no', { ascending: true })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const rows = data || []
        const wordSets = [...new Set(rows.filter(d => d.type !== 'idiom').map(d => d.set_no))].sort((a, b) => a - b)
        const idiomSets = [...new Set(rows.filter(d => d.type === 'idiom').map(d => d.set_no))].sort((a, b) => a - b)

        return NextResponse.json({ wordSets, idiomSets })
    }

    // 단어 조회 (배틀룸/배틀설정에서 사용, service role → RLS 우회)
    if (action === 'words') {
        const { ids, level, setNo, wordSets, idiomSets } = body

        if (ids && Array.isArray(ids) && ids.length > 0) {
            // question_ids로 조회
            const { data, error } = await admin
                .from('words')
                .select('*')
                .in('id', ids)
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            return NextResponse.json({ words: data || [] })
        }

        // 다중 세트 조회 (setup 페이지용)
        if (level && (wordSets || idiomSets)) {
            const queries = []
            if (wordSets && wordSets.length > 0) {
                queries.push(
                    admin.from('words').select('*')
                        .eq('level', level)
                        .in('set_no', wordSets)
                        .neq('type', 'idiom')
                        .order('id')
                )
            }
            if (idiomSets && idiomSets.length > 0) {
                queries.push(
                    admin.from('words').select('*')
                        .eq('level', level)
                        .in('set_no', idiomSets)
                        .eq('type', 'idiom')
                        .order('id')
                )
            }
            const results = await Promise.all(queries)
            const words = results.flatMap(r => r.data || [])
            return NextResponse.json({ words })
        }

        if (level && setNo != null) {
            // level + set_no로 조회
            const { data, error } = await admin
                .from('words')
                .select('*')
                .eq('level', level)
                .eq('set_no', setNo)
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            return NextResponse.json({ words: data || [] })
        }

        return NextResponse.json({ error: 'ids or level+setNo required' }, { status: 400 })
    }

    // nid → loginInfoId 변환 (login_info_id 없는 기존 세션 보완)
    if (action === 'resolve_uid') {
        const { nid } = body
        if (!nid) return NextResponse.json({ error: 'nid required' }, { status: 400 })
        const { data } = await admin
            .from('ipsinavi_login_info')
            .select('id')
            .eq('UserNID', Number(nid))
            .single()
        return NextResponse.json({ loginInfoId: data?.id || null })
    }

    // 이름 조회 (RLS 우회, 프로필 없으면 자동 생성)
    if (action === 'names') {
        const { ids } = body
        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: 'ids required' }, { status: 400 })
        }

        // 양수 ID만 프로필 조회 (음수는 게스트)
        const validIds = ids.filter((id: number) => id > 0)
        const names: Record<number, string> = {}

        if (validIds.length > 0) {
            const { data } = await admin.from('profiles').select('id, name').in('id', validIds)
            if (data) {
                data.forEach((p: { id: number; name: string | null }) => { names[Number(p.id)] = p.name || '익명' })
            }

            // 프로필이 없는 ID → ipsinavi_Login_info에서 조회 후 자동 생성
            const missingIds = validIds.filter((id: number) => !names[id])
            if (missingIds.length > 0) {
                const { data: loginInfos } = await admin
                    .from('ipsinavi_login_info')
                    .select('id, UserName, NsiteID, Scomment')
                    .in('id', missingIds)

                if (loginInfos && loginInfos.length > 0) {
                    const profilesToCreate = loginInfos.map((li: { id: number; UserName: string; NsiteID: number | null; Scomment: string | null }) => ({
                        id: li.id,
                        name: li.UserName,
                        NsiteID: li.NsiteID,
                        Scomment: li.Scomment,
                        status: '0',
                    }))
                    await admin.from('profiles').upsert(profilesToCreate, { onConflict: 'id' })
                    loginInfos.forEach((li: { id: number; UserName: string }) => {
                        names[Number(li.id)] = li.UserName || '익명'
                    })
                }
            }
        }

        // 게스트 ID 처리
        ids.filter((id: number) => id < 0).forEach((id: number) => { names[id] = '게스트' })

        return NextResponse.json({ names })
    }

    if (action === 'profiles') {
        const { ids } = body
        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: 'ids required' }, { status: 400 })
        }
        const { data } = await admin.from('profiles').select('id, name, NsiteID').in('id', ids)
        return NextResponse.json({ profiles: data || [] })
    }

    // 인증: 로그인 유저 우선, 없으면 클라이언트가 보낸 hostId(게스트 ID) 사용
    const rawId = await getAuthUserId() ?? (body.hostId != null ? Number(body.hostId) : null) ?? (body.userId != null ? Number(body.userId) : null)
    const authUserId: number | null = typeof rawId === 'number' && !isNaN(rawId) ? rawId : null
    if (!authUserId) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // ── 방 조회 (ID) + 참여자 이름 동시 반환 ──
    if (action === 'get') {
        const { roomId } = body

        const { data: room, error } = await admin
            .from('battle_rooms')
            .select('*')
            .eq('id', roomId)
            .single()

        if (error || !room) {
            return NextResponse.json({ error: '방을 찾을 수 없습니다.' }, { status: 404 })
        }

        // 참여자 이름도 함께 조회
        const allIds = room.participant_ids || []
        const pIds = allIds.filter((id: number) => id > 0)
        const names: Record<number, string> = {}
        // 게스트 ID 처리 (음수)
        allIds.filter((id: number) => id < 0).forEach((id: number) => { names[id] = '게스트' })

        console.log('[battle:get] participant_ids:', allIds, 'pIds:', pIds)

        if (pIds.length > 0) {
            const { data: profiles, error: profileErr } = await admin.from('profiles').select('id, name').in('id', pIds)
            console.log('[battle:get] profiles query:', { profiles, error: profileErr?.message })
            if (profiles) {
                profiles.forEach((p: { id: number; name: string | null }) => { names[Number(p.id)] = p.name || '익명' })
            }
            // 프로필 없는 ID → ipsinavi_Login_info에서 자동 생성
            const missing = pIds.filter((id: number) => !names[id])
            console.log('[battle:get] missing after profiles:', missing)
            if (missing.length > 0) {
                const { data: lis, error: lisErr } = await admin.from('ipsinavi_login_info').select('id, UserName, NsiteID, Scomment').in('id', missing)
                console.log('[battle:get] ipsinavi_login_info:', { lis, error: lisErr?.message })
                if (lis && lis.length > 0) {
                    const upsertResult = await admin.from('profiles').upsert(
                        lis.map((li: { id: number; UserName: string; NsiteID: number | null; Scomment: string | null }) => ({
                            id: li.id, name: li.UserName, NsiteID: li.NsiteID, Scomment: li.Scomment, status: '0',
                        })),
                        { onConflict: 'id' }
                    )
                    console.log('[battle:get] profiles upsert:', { error: upsertResult.error?.message })
                    lis.forEach((li: { id: number; UserName: string }) => { names[Number(li.id)] = li.UserName || '익명' })
                }
            }
        }

        console.log('[battle:get] final names:', names)
        return NextResponse.json({ room, names })
    }

    // ── 방 조회 (코드) ──
    if (action === 'find') {
        const { roomCode } = body

        const { data: room, error } = await admin
            .from('battle_rooms')
            .select('id, participant_ids, max_players, status')
            .eq('room_code', roomCode.toUpperCase())
            .single()

        if (error || !room) {
            return NextResponse.json({ error: '존재하지 않는 방 코드입니다.' }, { status: 404 })
        }

        return NextResponse.json({ room })
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

        const participants = (room.participant_ids || []).map(Number)
        if (participants.includes(Number(authUserId))) {
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

        if (!room || Number(room.host_id) !== Number(authUserId)) {
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

        const remaining = (room.participant_ids || []).filter((id: number) => Number(id) !== Number(authUserId))

        if (remaining.length === 0) {
            await admin.from('battle_rooms').delete().eq('id', roomId)
        } else {
            const newHost = Number(room.host_id) === Number(authUserId) ? remaining[0] : room.host_id
            await admin
                .from('battle_rooms')
                .update({ participant_ids: remaining, host_id: newHost })
                .eq('id', roomId)
        }

        return NextResponse.json({ ok: true })
    }

    // ── 학원 배틀 피드 조회 (최근 5건, RLS 우회) ──
    if (action === 'feed') {
        // 유저의 NsiteID 조회
        const { data: profile } = await admin
            .from('profiles').select('NsiteID').eq('id', authUserId).single()
        if (!profile?.NsiteID) {
            return NextResponse.json({ feeds: [] })
        }

        // 같은 학원의 최근 배틀 (2명 이상, 승자 있는 것만)
        const { data: battles } = await admin
            .from('battle_history')
            .select('id, winner_id, participants_ids, scores, created_at')
            .eq('NsiteID', profile.NsiteID)
            .not('winner_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20)

        // 2명 이상 필터 + 상위 5개
        const multiBattles = (battles || [])
            .filter(b => (b.participants_ids || []).length >= 2)
            .slice(0, 5)

        if (multiBattles.length === 0) {
            return NextResponse.json({ feeds: [], academyId: profile.NsiteID })
        }

        // 관련 프로필 일괄 조회
        const allIds = new Set<number>()
        multiBattles.forEach(b => {
            if (b.winner_id) allIds.add(b.winner_id)
            ;(b.participants_ids || []).forEach((id: number) => allIds.add(id))
        })
        const { data: profiles } = await admin
            .from('profiles').select('id, name').in('id', Array.from(allIds))
        const nameMap: Record<number, string> = {}
        ;(profiles || []).forEach((p: { id: number; name: string | null }) => {
            nameMap[p.id] = p.name || '익명'
        })

        const feeds = multiBattles.map(b => {
            const scores = b.scores as Record<string, number>
            const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a)
            const loserId = sorted[1]?.[0] ? Number(sorted[1][0]) : null
            return {
                id: b.id,
                winner_name: nameMap[b.winner_id] || '익명',
                loser_name: loserId ? (nameMap[loserId] || '익명') : '상대',
                winner_score: sorted[0]?.[1] || 0,
                loser_score: sorted[1]?.[1] || 0,
                participant_count: (b.participants_ids || []).length,
                created_at: b.created_at,
            }
        })

        return NextResponse.json({ feeds, academyId: profile.NsiteID })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
