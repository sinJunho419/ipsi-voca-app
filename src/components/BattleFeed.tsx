'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Swords } from 'lucide-react'

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
    const isMulti = feed.participant_count >= 3

    if (isMulti) {
        return (
            <>
                총 <strong>{feed.participant_count}명</strong>의 난전 속에서{' '}
                <strong style={{ color: '#a78bfa' }}>{feed.winner_name}</strong>님이 최후의 우승!
            </>
        )
    }

    if (isDouble) {
        return (
            <>
                <strong style={{ color: '#a78bfa' }}>{feed.winner_name}</strong>님이 무대를 장악했습니다!
            </>
        )
    }

    if (diff <= 10) {
        return (
            <>
                <strong style={{ color: '#a78bfa' }}>{feed.winner_name}</strong>님이{' '}
                <strong style={{ color: '#94a3b8' }}>{feed.loser_name}</strong>님과 혈투 끝에 승리!
            </>
        )
    }

    return (
        <>
            <strong style={{ color: '#a78bfa' }}>{feed.winner_name}</strong>님이 배틀에서 승리!
        </>
    )
}

function getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return '방금'
    if (min < 60) return `${min}분 전`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}시간 전`
    const day = Math.floor(hr / 24)
    return `${day}일 전`
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

    // 초기 로드: API에서 과거 기록 5건 조회
    useEffect(() => {
        async function loadFeed() {
            try {
                const res = await fetch('/api/battle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'feed' }),
                    cache: 'no-store',
                })
                if (!res.ok) return
                const data = await res.json()
                if (!mountedRef.current) return
                if (data.feeds) setFeeds(data.feeds)
                if (data.academyId) setAcademyId(data.academyId)
            } catch { /* ignore */ }
        }
        loadFeed()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // 실시간 새 배틀 수신
    useEffect(() => {
        if (!academyId) return

        const channel = supabase.channel(`academy_feed:${academyId}`, {
            config: { broadcast: { self: true } },
        })

        channel
            .on('broadcast', { event: 'battle_result' }, (payload) => {
                if (!mountedRef.current) return
                const data = payload.payload as FeedItem
                setFeeds(prev => {
                    if (prev.some(f => f.id === data.id)) return prev
                    return [data, ...prev].slice(0, 5)
                })
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [academyId, supabase])

    if (feeds.length === 0) return null

    return (
        <div style={{
            width: '100%',
            marginBottom: '0.75rem',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '0.5rem',
                color: '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 700,
            }}>
                <Swords size={14} />
                <span>최근 배틀</span>
            </div>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
            }}>
                <AnimatePresence initial={false}>
                    {feeds.map(feed => (
                        <motion.div
                            key={feed.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{
                                background: 'rgba(99, 102, 241, 0.06)',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1px solid rgba(99, 102, 241, 0.1)',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                color: '#e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                            }}
                        >
                            <span style={{ flex: 1, lineHeight: 1.4 }}>{getFeedMessage(feed)}</span>
                            <span style={{
                                fontSize: '0.68rem',
                                color: '#64748b',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}>
                                {getTimeAgo(feed.created_at)}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}
