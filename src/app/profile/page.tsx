'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import styles from '../study/study.module.css' // Reuse study styles for glassmorphism
import { useRouter } from 'next/navigation'

interface Rival {
    userId: string
    name: string
    wins: number
    losses: number
    winRate: number
    tag: string
}

export default function ProfilePage() {
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [myProfile, setMyProfile] = useState<{ name: string, academy_id: string } | null>(null)
    const [rivals, setRivals] = useState<Rival[]>([])

    useEffect(() => {
        let isMounted = true;
        async function load() {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!isMounted) return;

                if (!user) {
                    alert('로그인이 필요한 페이지입니다. 학습 페이지로 이동합니다.')
                    router.push('/study')
                    return
                }

                // 1. 프로필 로드
                const { data: profile } = await supabase.from('profiles').select('name, academy_id').eq('id', user.id).single()
                if (isMounted) setMyProfile(profile)

                // 2. 전적 로드 및 라이벌 분석
                const { data: history } = await supabase
                    .from('battle_history')
                    .select('*')
                    .contains('participants_ids', [user.id])
                    .order('created_at', { ascending: false })

                if (history) {
                    const rivalMap = new Map<string, { wins: number, losses: number }>()

                    history.forEach(h => {
                        const opponentId = h.participants_ids.find((id: string) => id !== user.id)
                        if (opponentId) {
                            const stats = rivalMap.get(opponentId) || { wins: 0, losses: 0 }
                            if (h.winner_id === user.id) stats.wins++
                            else if (h.winner_id === opponentId) stats.losses++
                            rivalMap.set(opponentId, stats)
                        }
                    })

                    // 상대방 이름 가져오기
                    const rivalList = await Promise.all(Array.from(rivalMap.entries()).map(async ([id, stats]) => {
                        const { data: p } = await supabase.from('profiles').select('name').eq('id', id).single()
                        const total = stats.wins + stats.losses
                        const winRate = total > 0 ? (stats.wins / total) * 100 : 0

                        let tag = '라이벌'
                        if (winRate >= 70) tag = '밥' // User wins mostly
                        else if (winRate <= 30) tag = '천적' // Opponent wins mostly
                        else if (total >= 10) tag = '숙명의 라이벌'

                        return {
                            userId: id,
                            name: p?.name || '익명',
                            wins: stats.wins,
                            losses: stats.losses,
                            winRate,
                            tag
                        }
                    }))

                    // 대결 횟수 순으로 정렬 상위 5명
                    setRivals(rivalList.sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses)).slice(0, 5))
                }
                if (isMounted) setLoading(false)
            } catch (err) {
                console.error('[ProfilePage] Failed to load:', err);
                if (isMounted) setLoading(false);
            }
        }
        load()
        return () => { isMounted = false }
    }, [supabase, router])

    if (loading) return <div className={styles.page}><div className={styles.loader}>마이페이지 로딩 중...</div></div>

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>내 프로필</h1>
                <p className={styles.subtitle}>{myProfile?.name || '익명'} 님의 배틀 리포트</p>
            </div>

            <main className={styles.bento}>
                {/* 나의 라이벌 섹션 */}
                <motion.section
                    className={styles.glass}
                    style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🥊 나의 라이벌
                    </h3>

                    {rivals.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>아직 배틀 기록이 없습니다.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {rivals.map(rival => (
                                <div key={rival.userId} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    background: 'rgba(255, 255, 255, 0.5)',
                                    borderRadius: '1rem',
                                    border: '1px solid rgba(99, 102, 241, 0.1)'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 800 }}>{rival.name}</span>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                background: rival.tag === '천적' ? '#fee2e2' : rival.tag === '밥' ? '#dcfce7' : '#e0e7ff',
                                                color: rival.tag === '천적' ? '#ef4444' : rival.tag === '밥' ? '#10b981' : '#6366f1'
                                            }}>{rival.tag}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                            {rival.wins}승 {rival.losses}패 (승률 {Math.round(rival.winRate)}%)
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '1.2rem' }}>
                                        {rival.winRate < 50 ? '😤' : '😎'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.section>

                <button
                    className={styles.backBtn}
                    style={{ marginTop: '1rem' }}
                    onClick={() => router.push('/study')}
                >
                    ← 돌아가기
                </button>
            </main>
        </div>
    )
}
