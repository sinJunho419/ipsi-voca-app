'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import styles from '../room.module.css'
import BattleClient from './BattleClient'

interface RoomData {
    id: string
    room_code: string
    host_id: string
    guest_id: string | null
    status: 'waiting' | 'playing' | 'finished'
    level: string
    set_no: number
}

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: roomId } = use(params)
    const router = useRouter()
    const supabase = createClient()

    const [room, setRoom] = useState<RoomData | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState('')

    // 1. 방 정보 로드 및 내 정보 확인
    useEffect(() => {
        let isMounted = true

        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                if (isMounted) setErrorMsg('로그인이 필요합니다.')
                return
            }
            if (isMounted) setUserId(user.id)

            const { data: roomData, error } = await supabase
                .from('battle_rooms')
                .select('*')
                .eq('id', roomId)
                .single()

            if (error || !roomData) {
                if (isMounted) setErrorMsg('방을 찾을 수 없습니다.')
                return
            }

            if (isMounted) {
                setRoom(roomData)
                setIsLoading(false)
            }
        }

        init()

        return () => { isMounted = false }
    }, [roomId, supabase])

    // 2. Supabase Realtime 구독 (Postgres Changes)
    useEffect(() => {
        if (!roomId) return

        const channel = supabase.channel(`room:${roomId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'battle_rooms', filter: `id=eq.${roomId}` },
                (payload) => {
                    console.log('Realtime Room Update:', payload.new)
                    setRoom(payload.new as RoomData)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [roomId, supabase])

    if (errorMsg) {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <h2 className={styles.errorText}>{errorMsg}</h2>
                    <br />
                    <button className={styles.btnSecondary} onClick={() => router.push('/battle/lobby')}>
                        로비로 돌아가기
                    </button>
                </div>
            </div>
        )
    }

    if (isLoading || !room || !userId) {
        return (
            <div className={styles.page}>
                <div className={styles.loader}>로딩 중...</div>
            </div>
        )
    }

    const isHost = room.host_id === userId
    const hasGuest = !!room.guest_id

    // 방장: 시작 버튼 핸들러
    const handleStartBattle = async () => {
        if (!isHost || !hasGuest) return

        const { error } = await supabase
            .from('battle_rooms')
            .update({ status: 'playing' })
            .eq('id', roomId)

        if (error) {
            console.error('Failed to start battle:', error)
            alert('배틀 시작에 실패했습니다.')
        }
    }

    // 상태에 따른 화면 렌더링
    if (room.status === 'playing' || room.status === 'finished') {
        return (
            <div className={styles.page}>
                <BattleClient room={room} myId={userId} />
            </div>
        )
    }

    // 기본 화면: Waiting Room (대기실)
    return (
        <div className={styles.page}>
            <div className={styles.blob1} />
            <div className={styles.blob2} />

            <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 25 }}
            >
                <div className={styles.header}>
                    <p className={styles.label}>초대 코드</p>
                    <h1 className={styles.roomCode}>{room.room_code}</h1>
                    <p className={styles.subtitle}>친구에게 코드를 알려주세요!</p>
                </div>

                <div className={styles.playerContainer}>
                    <div className={styles.playerCard}>
                        <div className={styles.avatarWrap}>
                            <span className={styles.avatar}>👑</span>
                        </div>
                        <p className={styles.playerName}>
                            {isHost ? '나 (방장)' : '방장'}
                        </p>
                    </div>

                    <div className={styles.vs}>VS</div>

                    <div className={`${styles.playerCard} ${!hasGuest ? styles.empty : ''}`}>
                        <div className={styles.avatarWrap}>
                            <span className={styles.avatar}>
                                {hasGuest ? '😎' : '⏳'}
                            </span>
                        </div>
                        <p className={styles.playerName}>
                            {hasGuest
                                ? (isHost ? '상대방' : '나 (참가자)')
                                : '대기 중...'
                            }
                        </p>
                    </div>
                </div>

                <div className={styles.actions}>
                    {isHost ? (
                        <button
                            className={styles.btnPrimary}
                            onClick={handleStartBattle}
                            disabled={!hasGuest}
                        >
                            {hasGuest ? '배틀 시작하기' : '상대방 기다리는 중...'}
                        </button>
                    ) : (
                        <div className={styles.waitingMsg}>
                            <div className={styles.spinner} />
                            <p>방장이 시작하기를 기다리고 있습니다...</p>
                        </div>
                    )}
                </div>

                <button className={styles.backBtn} onClick={() => router.push('/battle/lobby')}>
                    ← 나가기
                </button>
            </motion.div>
        </div>
    )
}
