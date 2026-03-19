import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

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
    const body = await request.json()
    const { action } = body

    const userId = await getAuthUserId()
    if (!userId) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // ── 주간 리포트 데이터 조회 (RLS 우회) ──
    if (action === 'weekly') {
        const { weekStart, weekEnd } = body
        if (!weekStart || !weekEnd) {
            return NextResponse.json({ error: 'weekStart, weekEnd required' }, { status: 400 })
        }

        // 프로필
        const { data: profile } = await admin
            .from('profiles').select('name, NsiteID').eq('id', userId).single()

        // 배틀 기록 (이번 주 전체)
        const { data: battles } = await admin
            .from('battle_history')
            .select('winner_id, participants_ids, created_at')
            .gte('created_at', weekStart)
            .lt('created_at', weekEnd)

        // 내 배틀만 필터 (혼자 한 것 제외: participants 2명 이상)
        // bigint[]는 문자열로 반환될 수 있으므로 Number 변환 후 비교
        const myBattles = (battles || []).filter(b => {
            const pids = (b.participants_ids || []).map(Number)
            return pids.length > 1 && pids.includes(userId)
        })

        const totalBattles = myBattles.length
        const wins = myBattles.filter(b => Number(b.winner_id) === userId).length
        const winRate = totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0

        // 학습/테스트 횟수
        const { count: studyCount } = await admin
            .from('activity_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('activity_type', 'study_complete')
            .gte('created_at', weekStart)
            .lt('created_at', weekEnd)

        const { count: quizCount } = await admin
            .from('activity_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('activity_type', 'quiz_complete')
            .gte('created_at', weekStart)
            .lt('created_at', weekEnd)

        // 정복 단어/숙어 (누적)
        const { data: masteredRows } = await admin
            .from('wrong_answers')
            .select('word_id')
            .eq('user_id', userId)
            .eq('status', 'Mastered')

        let masteredIdiomCount = 0
        const masteredTotal = masteredRows?.length || 0
        if (masteredRows && masteredRows.length > 0) {
            const masteredIds = masteredRows.map(r => r.word_id)
            const { count: idiomCount } = await admin
                .from('words')
                .select('*', { count: 'exact', head: true })
                .in('id', masteredIds)
                .eq('type', 'idiom')
            masteredIdiomCount = idiomCount || 0
        }
        const masteredWordCount = masteredTotal - masteredIdiomCount

        // 요일별 활동 (배틀 + 학습 + 테스트)
        const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0]
        myBattles.forEach(b => {
            const d = new Date(b.created_at)
            const dow = d.getDay()
            dayCounts[dow === 0 ? 6 : dow - 1]++
        })

        const { data: activityRows } = await admin
            .from('activity_log')
            .select('created_at')
            .eq('user_id', userId)
            .gte('created_at', weekStart)
            .lt('created_at', weekEnd)

        ;(activityRows || []).forEach((r: { created_at: string }) => {
            const d = new Date(r.created_at)
            const dow = d.getDay()
            dayCounts[dow === 0 ? 6 : dow - 1]++
        })

        const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
        const dailyActivity = DAY_LABELS.map((day, i) => ({ day, count: dayCounts[i] }))
        const totalActivity = (studyCount || 0) + (quizCount || 0) + totalBattles

        // 학원 평균 비교
        let academyAvg = null
        if (profile?.NsiteID) {
            const { data: academyUsers } = await admin
                .from('profiles').select('id').eq('NsiteID', profile.NsiteID)

            if (academyUsers && academyUsers.length > 1) {
                const academyIds = academyUsers.map((u: { id: number }) => u.id)

                let totalBattlesSum = 0
                let totalWinsSum = 0
                let totalMasteredSum = 0
                let totalStudySum = 0
                let totalQuizSum = 0
                let userCount = 0

                for (const uid of academyIds) {
                    const uidNum = Number(uid)
                    const userBattles = (battles || []).filter(b => {
                        const pids = (b.participants_ids || []).map(Number)
                        return pids.length > 1 && pids.includes(uidNum)
                    })

                    const { count: uStudy } = await admin
                        .from('activity_log')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', uid)
                        .eq('activity_type', 'study_complete')
                        .gte('created_at', weekStart)
                        .lt('created_at', weekEnd)

                    const { count: uQuiz } = await admin
                        .from('activity_log')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', uid)
                        .eq('activity_type', 'quiz_complete')
                        .gte('created_at', weekStart)
                        .lt('created_at', weekEnd)

                    if (userBattles.length === 0 && (uStudy || 0) === 0 && (uQuiz || 0) === 0 && uidNum !== userId) continue

                    const uWins = userBattles.filter(b => Number(b.winner_id) === uidNum).length

                    const { count: uMastered } = await admin
                        .from('wrong_answers')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', uid)
                        .eq('status', 'Mastered')

                    totalBattlesSum += userBattles.length
                    totalWinsSum += userBattles.length > 0
                        ? Math.round((uWins / userBattles.length) * 100)
                        : 0
                    totalMasteredSum += (uMastered || 0)
                    totalStudySum += (uStudy || 0)
                    totalQuizSum += (uQuiz || 0)
                    userCount++
                }

                if (userCount > 0) {
                    academyAvg = {
                        avgBattles: Math.round(totalBattlesSum / userCount),
                        avgWinRate: Math.round(totalWinsSum / userCount),
                        avgMastered: Math.round(totalMasteredSum / userCount),
                        avgStudy: Math.round(totalStudySum / userCount),
                        avgQuiz: Math.round(totalQuizSum / userCount),
                    }
                }
            }
        }

        return NextResponse.json({
            userName: profile?.name || '학생',
            report: {
                studyCount: studyCount || 0,
                quizCount: quizCount || 0,
                totalBattles, wins, winRate,
                masteredWordCount,
                masteredIdiomCount,
                dailyActivity, totalActivity,
            },
            academyAvg,
        })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
