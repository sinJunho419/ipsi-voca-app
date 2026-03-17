'use client'

import { use, useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Crown, Swords, Users, User, LogOut } from 'lucide-react'
import { getTierInfo } from '@/lib/tierSystem'
import type { Level } from '@/types/vocabulary'
import styles from '../room.module.css'
import BattleClient from './BattleClient'

interface RoomData {
    id: string
    room_code: string
    host_id: number
    participant_ids: number[]
    max_players: number
    status: 'waiting' | 'playing' | 'finished'
    level: string
    set_no: number
    question_ids: number[] | null
    finished_at: string | null
    mode: 'normal' | 'revenge'
    question_count: number
}

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: roomId } = use(params)
    const router = useRouter()
    const supabase = createClient()

    const [room, setRoom] = useState<RoomData | null>(null)
    const [userId, setUserId] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState('')

    // 대기 타이머 (60초)
    const [waitSeconds, setWaitSeconds] = useState(60)
    const waitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // 방장 위임 알림
    const [hostTransferMsg, setHostTransferMsg] = useState('')
    // 코드 복사 피드백
    const [copyMsg, setCopyMsg] = useState('')

    // 참여자 이름
    const [participantNames, setParticipantNames] = useState<Record<number, string>>({})

    // 전적 기록
    const [records, setRecords] = useState<Record<number, { wins: number; losses: number }>>({})

    // 1. 방 정보 로드 (로그인 불필요 — 게스트 ID 허용)
    useEffect(() => {
        let isMounted = true

        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            let uid: number | null = (user?.user_metadata?.login_info_id as number) || null

            // 비로그인 → 게스트 ID (음수로 구분)
            if (!uid) {
                const stored = localStorage.getItem('battle_guest_id')
                let guestId: number
                if (stored) {
                    guestId = Number(stored)
                } else {
                    guestId = -Math.floor(Math.random() * 1_000_000_000)
                    localStorage.setItem('battle_guest_id', String(guestId))
                }
                uid = guestId
            }

            if (isMounted) setUserId(uid)

            // 서버 API로 방 조회 (admin client → RLS 우회)
            const res = await fetch('/api/battle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get', roomId, userId: uid }),
            })

            const result = await res.json()
            if (!res.ok || !result.room) {
                if (isMounted) setErrorMsg('방을 찾을 수 없습니다.')
                return
            }

            const roomData = {
                ...result.room,
                host_id: Number(result.room.host_id),
                participant_ids: (result.room.participant_ids || []).map(Number),
            }

            if (isMounted) {
                setRoom(roomData)
                setIsLoading(false)
            }
        }

        init()
        return () => { isMounted = false }
    }, [roomId, supabase])

    // 2. Realtime 구독 (Postgres Changes)
    useEffect(() => {
        if (!roomId) return

        const channel = supabase.channel(`room:${roomId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'battle_rooms', filter: `id=eq.${roomId}` },
                (payload) => {
                    const raw = payload.new as RoomData
                    setRoom({
                        ...raw,
                        host_id: Number(raw.host_id),
                        participant_ids: (raw.participant_ids || []).map(Number),
                    })
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [roomId, supabase])

    // 3. 참여자 이름 조회 (participant_ids 변경 시)
    const participantKey = (room?.participant_ids || []).join(',')
    useEffect(() => {
        const ids = room?.participant_ids
        if (!ids?.length) return

        async function fetchNames() {
            const { data } = await supabase
                .from('profiles')
                .select('id, name')
                .in('id', ids!)
            if (data) {
                const names: Record<number, string> = {}
                data.forEach(p => { names[p.id] = p.name || '익명' })
                setParticipantNames(names)
            }
        }
        fetchNames()
    }, [participantKey, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

    // 3.5. 전적 기록 조회
    useEffect(() => {
        const ids = room?.participant_ids
        if (!ids?.length) return

        async function fetchRecords() {
            const { data: histories } = await supabase
                .from('battle_history')
                .select('winner_id, participants_ids')
                .overlaps('participants_ids', ids!)

            if (!histories) return

            const rec: Record<number, { wins: number; losses: number }> = {}
            ids!.forEach(id => { rec[id] = { wins: 0, losses: 0 } })

            histories.forEach((h: { winner_id: number | null; participants_ids: number[] }) => {
                (h.participants_ids || []).forEach((pid: number) => {
                    if (!rec[pid]) return
                    if (h.winner_id === pid) rec[pid].wins++
                    else if (h.winner_id) rec[pid].losses++
                })
            })

            setRecords(rec)
        }
        fetchRecords()
    }, [participantKey, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

    // 4. Presence 채널 - 방장 이탈 감지 & 자동 위임 (디바운스)
    const hostTransferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (!room || room.status !== 'waiting' || !userId) return

        const presenceChannel = supabase.channel(`presence:${roomId}`)

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState()
                const onlineUserIds = Object.values(state)
                    .flat()
                    .map((p: Record<string, unknown>) => p.user_id as number)

                const participants = room.participant_ids || []
                const hostOffline = !onlineUserIds.includes(room.host_id)
                const iAmParticipant = participants.includes(userId) && room.host_id !== userId

                // 방장이 오프라인이고, 내가 온라인 참여자 중 첫 번째이면 위임 받기
                if (hostOffline && iAmParticipant) {
                    const nextHost = participants.find(
                        id => id !== room.host_id && onlineUserIds.includes(id)
                    )
                    if (nextHost === userId) {
                        if (hostTransferTimerRef.current) clearTimeout(hostTransferTimerRef.current)
                        hostTransferTimerRef.current = setTimeout(async () => {
                            const others = participants.filter(id => id !== room.host_id)
                            await supabase
                                .from('battle_rooms')
                                .update({ host_id: userId, participant_ids: others })
                                .eq('id', roomId)
                            setHostTransferMsg('방장이 나갔습니다. 당신이 새 방장이 되었습니다!')
                            setTimeout(() => setHostTransferMsg(''), 3000)
                        }, 3000)
                    }
                } else {
                    if (hostTransferTimerRef.current) {
                        clearTimeout(hostTransferTimerRef.current)
                        hostTransferTimerRef.current = null
                    }
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ user_id: userId })
                }
            })

        return () => {
            if (hostTransferTimerRef.current) clearTimeout(hostTransferTimerRef.current)
            supabase.removeChannel(presenceChannel)
        }
    }, [room?.status, room?.host_id, room?.participant_ids?.length, userId, roomId, supabase])

    // 5. 대기 타이머 (60초) — 최초 1회만 시작
    const timerStartedRef = useRef(false)

    useEffect(() => {
        if (!room || room.status !== 'waiting') return
        if (timerStartedRef.current) return // 이미 시작됨 → 재실행 방지
        timerStartedRef.current = true

        setWaitSeconds(60)
        waitTimerRef.current = setInterval(() => {
            setWaitSeconds(prev => {
                if (prev <= 1) {
                    if (waitTimerRef.current) clearInterval(waitTimerRef.current)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            if (waitTimerRef.current) clearInterval(waitTimerRef.current)
        }
    }, [room?.status])

    // 타이머 만료 시: 2명 이상 → 자동 시작 / 방장 혼자 → 방 폭파
    useEffect(() => {
        if (waitSeconds > 0 || !room || room.status !== 'waiting') return

        const count = room.participant_ids?.length || 0

        // 방장만 액션 수행 (다른 참여자는 Realtime으로 감지)
        if (room.host_id === userId) {
            if (count >= 2) {
                // 2명 이상: 자동 배틀 시작
                fetch('/api/battle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'start', roomId, hostId: userId }),
                })
            } else {
                // 방장 혼자: 방 폭파 → 로비로 이동
                fetch('/api/battle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'leave', roomId, userId }),
                }).then(() => router.push('/battle/lobby'))
            }
        }
    }, [waitSeconds, room, userId, roomId, router])

    // 6. 방 자동 정리: finished 후 5분 경과 시
    useEffect(() => {
        if (!room || room.status !== 'finished' || !room.finished_at) return

        const remaining = 5 * 60 * 1000 - (Date.now() - new Date(room.finished_at).getTime())

        if (remaining <= 0) { router.push('/battle/lobby'); return }

        const timer = setTimeout(() => router.push('/battle/lobby'), remaining)
        return () => clearTimeout(timer)
    }, [room?.status, room?.finished_at, router])

    // 나가기 처리 (서버 API → RLS 우회)
    const handleLeave = useCallback(async () => {
        if (!room || !userId) { router.push('/battle/lobby'); return }

        await fetch('/api/battle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'leave', roomId, userId }),
        })

        router.push('/battle/lobby')
    }, [room, userId, roomId, router])

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

    const isHost = Number(room.host_id) === Number(userId)
    const participantCount = room.participant_ids?.length || 0
    const tierInfo = room.level ? getTierInfo(room.level as Level) : null

    // 방장: 배틀 시작 핸들러 (2명 이상일 때만)
    const handleStartBattle = async () => {
        if (!isHost || participantCount < 2) return

        if (waitTimerRef.current) clearInterval(waitTimerRef.current)

        const res = await fetch('/api/battle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start', roomId, hostId: userId }),
        })

        if (!res.ok) {
            console.error('Failed to start battle')
            alert('배틀 시작에 실패했습니다.')
        }
    }

    // 배틀 진행/종료 화면
    if (room.status === 'playing' || room.status === 'finished') {
        return (
            <div className={styles.page}>
                <BattleClient room={room} myId={userId} />
            </div>
        )
    }

    const timerPercent = (waitSeconds / 60) * 100

    // 대기실
    return (
        <div className={styles.page}>
            <div className={styles.blob1} />
            <div className={styles.blob2} />

            <motion.div
                className={styles.waitingWrap}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 25 }}
            >
                {/* ── 상단: 초대 코드 배너 ── */}
                <div className={styles.inviteBanner}>
                    {room.mode === 'revenge' && (
                        <div className={styles.revengeBadge}>
                            <Swords size={14} /> 리벤지 배틀
                        </div>
                    )}
                    <div className={styles.inviteRow}>
                        <span className={styles.inviteLabel}>초대 코드:</span>
                        <span className={styles.inviteCode}>{room.room_code}</span>
                        <button
                            className={styles.copyBtn}
                            onClick={() => {
                                navigator.clipboard.writeText(room.room_code).catch(() => {})
                                setCopyMsg('복사됨!')
                                setTimeout(() => setCopyMsg(''), 1500)
                            }}
                        >
                            {copyMsg || '복사'}
                        </button>
                    </div>
                    <p className={styles.inviteHint}>친구들에게 공유하세요!</p>
                </div>

                {/* ── 방장 위임 알림 ── */}
                <AnimatePresence>
                    {hostTransferMsg && (
                        <motion.div
                            className={styles.transferMsg}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            {hostTransferMsg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── 카운트다운 타이머 ── */}
                <div className={styles.timerSection}>
                    <div className={styles.timerTrack}>
                        <motion.div
                            className={styles.timerFillWait}
                            animate={{ width: `${timerPercent}%` }}
                            transition={{ duration: 1, ease: 'linear' }}
                            style={{
                                backgroundColor: waitSeconds > 30 ? '#06b6d4' : waitSeconds > 10 ? '#6366f1' : '#ef4444',
                            }}
                        />
                    </div>
                    <p className={`${styles.timerText} ${waitSeconds <= 10 ? styles.timerUrgent : ''}`}>
                        {participantCount >= 2
                            ? `${waitSeconds}초 후 자동 시작`
                            : `${waitSeconds}초 후 방 자동 종료`}
                    </p>
                </div>

                {/* ── 참여자 리스트 ── */}
                <div className={styles.participantSection}>
                    <p className={styles.participantHeader}>
                        <Users size={16} />
                        참여자 {participantCount}명
                    </p>
                    <div className={styles.participantList}>
                        {(room.participant_ids || []).map((pid) => {
                            const isThisHost = Number(pid) === Number(room.host_id)
                            const isMe = Number(pid) === Number(userId)
                            return (
                                <motion.div
                                    key={pid}
                                    className={`${styles.participantItem} ${isMe ? styles.participantMe : ''}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    <div className={styles.participantAvatar}>
                                        {isThisHost ? <Crown size={16} /> : <User size={16} />}
                                    </div>
                                    <span className={styles.participantName}>
                                        {participantNames[pid] || '로딩...'}
                                        {isMe && ' (나)'}
                                    </span>
                                    {tierInfo && (
                                        <span
                                            className={styles.tierBadge}
                                            style={{ color: tierInfo.color, background: tierInfo.bg, borderColor: tierInfo.color }}
                                        >
                                            {tierInfo.label}
                                        </span>
                                    )}
                                    {isThisHost && <span className={styles.hostTag}>방장</span>}
                                    <div className={styles.recordBadge}>
                                        <span className={styles.recordWin}>{records[pid]?.wins ?? 0}승</span>
                                        <span className={styles.recordLose}>{records[pid]?.losses ?? 0}패</span>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>

                {/* ── 하단 액션 ── */}
                <div className={styles.actions}>
                    {isHost ? (
                        <button
                            className={styles.btnPrimary}
                            onClick={handleStartBattle}
                            disabled={participantCount < 2}
                        >
                            {participantCount >= 2
                                ? `🚀 배틀 시작 (${participantCount}명)`
                                : '⏳ 상대를 기다리는 중...'}
                        </button>
                    ) : (
                        <div className={styles.waitingMsg}>
                            <div className={styles.spinner} />
                            <p>방장이 시작하기를 기다리는 중...</p>
                        </div>
                    )}
                </div>

                <button className={styles.backBtn} onClick={handleLeave}>
                    <LogOut size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                    나가기
                </button>
            </motion.div>
        </div>
    )
}
