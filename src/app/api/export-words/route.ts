import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
    // 전체 단어 조회 (페이지네이션으로 전부 가져오기)
    const allWords: Record<string, unknown>[] = []
    const PAGE_SIZE = 1000
    let from = 0

    while (true) {
        const { data, error } = await admin
            .from('words')
            .select('type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence')
            .order('level')
            .order('set_no')
            .order('id')
            .range(from, from + PAGE_SIZE - 1)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!data || data.length === 0) break
        allWords.push(...data)
        if (data.length < PAGE_SIZE) break
        from += PAGE_SIZE
    }

    // CSV 생성
    const header = '타입,학년,세트,단어,뜻1,뜻2,뜻3,예문'
    const rows = allWords.map(w => {
        return [
            csvEscape(String(w.type ?? '')),
            csvEscape(String(w.level ?? '')),
            csvEscape(String(w.set_no ?? '')),
            csvEscape(String(w.word ?? '')),
            csvEscape(String(w.mean_1 ?? '')),
            csvEscape(String(w.mean_2 ?? '')),
            csvEscape(String(w.mean_3 ?? '')),
            csvEscape(String(w.example_sentence ?? '')),
        ].join(',')
    })

    const csv = '\uFEFF' + header + '\n' + rows.join('\n')

    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="words.csv"',
        },
    })
}

function csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return '"' + value.replace(/"/g, '""') + '"'
    }
    return value
}
