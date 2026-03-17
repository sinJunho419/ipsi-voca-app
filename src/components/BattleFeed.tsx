'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface FeedItem {
    id: string
    winner_name: string
    loser_name: string
    winner_score: number
    loser_score: number
    participant_count: number
    created_at: string
}

function getFeedMessage(feed: FeedItem): React.ReactNode {
    const diff = feed.winner_score - feed.loser_score
    const isDouble = feed.winner_score >= feed.loser_score * 2 && feed.winner_score > 0
    const isMassive = feed.participant_count >= 50

    if (isMassive) {
        return (
            <span>
                총 <strong style={{ color: '#f59e0b' }}>{feed.participant_count}명</strong>의 난전 속에서{' '}
                <strong style={{ color: '#6366f1' }}>{feed.winner_name}</strong>님이 최후의 우승! 🎖️
            </span>
        )
    }

    if (isDouble) {
        return (
            <span>
                공부 괴물 <strong style={{ color: '#6366f1' }}>{feed.winner_name}</strong>님이 무대를 장악했습니다! 👑
            </span>
        )
    }

    if (diff <= 10) {
        return (
            <span>
                <strong style={{ color: '#ef4444' }}>{feed.winner_name}</strong>님이{' '}
                <strong style={{ color: '#3b82f6' }}>{feed.loser_name}</strong>님과 혈투 끝에 승리! ⚔️
            </span>
        )
    }

    return (
        <span>
            🏆 <strong style={{ color: '#10b981' }}>{feed.winner_name}</strong>님이 배틀에서 승리했습니다!
        </span>
    )
}

export default function BattleFeed() {
    const supabase = createClient()
    const [feeds, setFeeds] = useState<FeedItem[]>([])
    const [academyId, setAcademyId] = useState<number | null>(null)
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const loginInfoId = user.user_metadata?.login_info_id as number
            if (!loginInfoId) return
            const { data: profile } = await supabase
                .from('profiles').select('NsiteID').eq('id', loginInfoId).single()
            if (profile?.NsiteID && mountedRef.current) {
                setAcademyId(profile.NsiteID)
            }
        }
        init()
    }, [supabase])

    useEffect(() => {
        if (!academyId) return

        // Postgres Changes 대신 academy별 Broadcast 채널 사용
        // BattleClient가 battle_history INSERT 후 이 채널로 피드를 발행
        // → DB 폴링 없이 순수 WebSocket만 사용하므로 50명+ 동시접속에 유리
        const channel = supabase.channel(`academy_feed:${academyId}`, {
            config: { broadcast: { self: true } },
        })

        channel
            .on('broadcast', { event: 'battle_result' }, (payload) => {
                if (!mountedRef.current) return
                const data = payload.payload as FeedItem
                setFeeds(prev => [data, ...prev].slice(0, 5))

                setTimeout(() => {
                    if (!mountedRef.current) return
                    setFeeds(prev => prev.filter(f => f.id !== data.id))
                }, 5000)
            })
            .subscribe()

        // 폴백: Postgres Changes도 구독 (피드 발행 누락 대비)
        const pgChannel = supabase.channel(`battle_history_pg:${academyId}`)
        pgChannel
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'battle_history',
                    filter: `NsiteID=eq.${academyId}`
                },
                async (pgPayload) => {
                    if (!mountedRef.current) return
                    const entry = pgPayload.new as Record<string, unknown>

                    // 이미 Broadcast로 받은 피드인지 확인
                    setFeeds(prev => {
                        if (prev.some(f => f.id === entry.id)) return prev
                        return prev // 중복이 아니면 아래에서 처리
                    })

                    const scores = entry.scores as Record<string, number>
                    const participantIds = entry.participants_ids as number[]
                    const winnerId = entry.winner_id as number
                    if (!winnerId) return

                    const { data: winnerProfile } = await supabase
                        .from('profiles').select('name').eq('id', winnerId).single()

                    const loserId = participantIds.find(id => id !== winnerId)
                    let loserName = '상대'
                    if (loserId) {
                        const { data: loserProfile } = await supabase
                            .from('profiles').select('name').eq('id', loserId).single()
                        loserName = loserProfile?.name || '익명'
                    }

                    const sortedScores = Object.values(scores).sort((a, b) => b - a)

                    const feed: FeedItem = {
                        id: entry.id as string,
                        winner_name: winnerProfile?.name || '익명',
                        loser_name: loserName,
                        winner_score: sortedScores[0] || 0,
                        loser_score: sortedScores[1] || 0,
                        participant_count: participantIds.length,
                        created_at: entry.created_at as string
                    }

                    if (!mountedRef.current) return
                    setFeeds(prev => {
                        if (prev.some(f => f.id === feed.id)) return prev
                        const next = [feed, ...prev].slice(0, 5)
                        return next
                    })

                    setTimeout(() => {
                        if (!mountedRef.current) return
                        setFeeds(prev => prev.filter(f => f.id !== feed.id))
                    }, 5000)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
            supabase.removeChannel(pgChannel)
        }
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
            pointerEvents: 'none',
            maxHeight: 'calc(100vh - 200px)',
        }}>
            <AnimatePresence>
                {feeds.map(feed => (
                    <motion.div
                        key={feed.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.85)',
                            backdropFilter: 'blur(12px)',
                            padding: '12px 18px',
                            borderRadius: '16px',
                            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.15)',
                            border: '1.5px solid rgba(99, 102, 241, 0.2)',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: '#1e1b4b',
                            maxWidth: '300px',
                            pointerEvents: 'auto'
                        }}
                    >
                        {getFeedMessage(feed)}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}
