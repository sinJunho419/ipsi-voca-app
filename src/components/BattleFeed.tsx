'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface FeedItem {
    id: string
    winner_name: string
    diff: number
    is_double: boolean
    created_at: string
}

export default function BattleFeed() {
    const supabase = createClient()
    const [feeds, setFeeds] = useState<FeedItem[]>([])
    const [academyId, setAcademyId] = useState<string | null>(null)

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase.from('profiles').select('academy_id').eq('id', user.id).single()
            if (profile?.academy_id) {
                setAcademyId(profile.academy_id)
            }
        }
        init()
    }, [supabase])

    useEffect(() => {
        if (!academyId) return

        const channel = supabase.channel('battle_history_feed')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'battle_history',
                    filter: `academy_id=eq.${academyId}`
                },
                async (payload) => {
                    const newEntry = payload.new
                    // 승자 이름 가져오기
                    const { data: winnerProfile } = await supabase
                        .from('profiles')
                        .select('name')
                        .eq('id', newEntry.winner_id)
                        .single()

                    const scores = Object.values(newEntry.scores as Record<string, number>).sort((a, b) => b - a)
                    const diff = scores.length > 1 ? scores[0] - scores[1] : 0
                    const isDouble = scores.length > 1 && scores[0] >= (scores[1] * 2) && scores[0] > 0

                    const feed: FeedItem = {
                        id: newEntry.id,
                        winner_name: winnerProfile?.name || '익명',
                        diff,
                        is_double: isDouble,
                        created_at: newEntry.created_at
                    }

                    setFeeds(prev => [feed, ...prev].slice(0, 5))

                    // 5초 후 제거 예정 (애니메이션 처리를 위해 상태에서 바로 지우지는 않고 UI에서 처리하거나 타이머 사용)
                    setTimeout(() => {
                        setFeeds(prev => prev.filter(f => f.id !== feed.id))
                    }, 5000)
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [academyId, supabase])

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'none'
        }}>
            <AnimatePresence>
                {feeds.map(feed => (
                    <motion.div
                        key={feed.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(10px)',
                            padding: '12px 20px',
                            borderRadius: '16px',
                            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.15)',
                            border: '1.5px solid rgba(99, 102, 241, 0.2)',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            color: '#1e1b4b',
                            maxWidth: '280px',
                            pointerEvents: 'auto'
                        }}
                    >
                        {feed.is_double ? (
                            <span>⚡ 공부 괴물 <span style={{ color: '#6366f1' }}>{feed.winner_name}</span>님이 무대를 압도했습니다!</span>
                        ) : feed.diff <= 3 ? (
                            <span>🔥 초접전 혈투 끝에 <span style={{ color: '#ef4444' }}>{feed.winner_name}</span> 승리!</span>
                        ) : (
                            <span>🏆 <span style={{ color: '#10b981' }}>{feed.winner_name}</span>님이 배틀에서 승리했습니다!</span>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}
