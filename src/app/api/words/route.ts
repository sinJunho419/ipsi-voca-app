import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Service-role 기반 단어 API
 * 클라이언트에서 HTTP Supabase 직접 호출 시 Mixed Content 차단 문제 우회
 */
const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
    const body = await request.json()
    const { action } = body

    // 세트 목록 조회
    if (action === 'sets') {
        const { level } = body
        if (!level) return NextResponse.json({ error: 'level required' }, { status: 400 })

        const { data, error } = await admin
            .from('words')
            .select('set_no, type')
            .eq('level', level)
            .order('set_no', { ascending: true })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const rows = data || []
        // (set_no, type) 쌍으로 중복 제거
        const seen = new Set<string>()
        const sets: { setNo: number; type: string }[] = []
        for (const d of rows) {
            const key = `${d.type}:${d.set_no}`
            if (!seen.has(key)) {
                seen.add(key)
                sets.push({ setNo: d.set_no, type: d.type || 'word' })
            }
        }

        const wordSets = sets.filter(s => s.type !== 'idiom').map(s => s.setNo)
        const idiomSets = sets.filter(s => s.type === 'idiom').map(s => s.setNo)

        return NextResponse.json({ wordSets, idiomSets, sets })
    }

    // 단어 조회 (ID 기반)
    if (action === 'by_ids') {
        const { ids } = body
        if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: 'ids required' }, { status: 400 })

        const { data, error } = await admin.from('words').select('*').in('id', ids)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ words: data || [] })
    }

    // 단어 조회 (level + set_no + type 기반)
    if (action === 'query') {
        const { level, setNo, type } = body
        if (!level || setNo == null) return NextResponse.json({ error: 'level and setNo required' }, { status: 400 })

        let query = admin.from('words').select('*').eq('level', level).eq('set_no', setNo)
        if (type === 'idiom') {
            query = query.eq('type', 'idiom')
        } else if (type === 'word') {
            query = query.neq('type', 'idiom')
        }

        const { data, error } = await query.order('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ words: data || [] })
    }

    // 다중 세트 단어 조회 (배틀용)
    if (action === 'multi_sets') {
        const { level, wordSets, idiomSets } = body
        if (!level) return NextResponse.json({ error: 'level required' }, { status: 400 })

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

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
