import { createClient } from '@/lib/supabase/server'
import type { Word } from '@/types/vocabulary'
import StudyClient from './StudyClient'

/**
 * Server Component: 초기 데이터(elem_low, Set 1)를 서버에서 미리 fetch해서
 * 페이지 첫 로드 시 클라이언트 fetch 없이 즉시 표시합니다.
 */
export default async function StudyPage() {
    const supabase = await createClient()

    const [maxResult, wordsResult] = await Promise.all([
        supabase
            .from('words')
            .select('set_no')
            .eq('level', 'elem_3')
            .order('set_no', { ascending: false })
            .limit(1)
            .single(),
        supabase
            .from('words')
            .select('*')
            .eq('level', 'elem_3')
            .eq('set_no', 1)
            .order('id'),
    ])

    const initialWords = (wordsResult.data ?? []) as Word[]
    const initialMaxSet = maxResult.data?.set_no ?? 1

    return (
        <StudyClient
            initialWords={initialWords}
            initialMaxSet={initialMaxSet}
        />
    )
}
