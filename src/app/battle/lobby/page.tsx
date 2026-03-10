'use client'

import { useState, useEffect, useTransition, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Level } from '@/types/vocabulary'
import { getSetLabel } from '@/lib/setAliases'
import styles from './lobby.module.css'

const LEVELS: { value: Level; label: string }[] = [
    { value: 'elem_3', label: '초등 3학년' },
    { value: 'elem_4', label: '초등 4학년' },
    { value: 'elem_5', label: '초등 5학년' },
    { value: 'elem_6', label: '초등 6학년' },
    { value: 'high_1', label: '고등 1학년' },
]

const QUESTION_COUNTS = [10, 20, 25, 40]

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/** 로그인 유저 ID 또는 게스트 ID (로그인 불필요) */
async function getUserId(supabase: ReturnType<typeof createClient>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return user.id
    // 비로그인 → 브라우저별 고유 게스트 ID 생성/재사용
    let guestId = localStorage.getItem('battle_guest_id')
    if (!guestId) {
        guestId = crypto.randomUUID()
        localStorage.setItem('battle_guest_id', guestId)
    }
    return guestId
}

interface BattleConfig {
    level: Level
    selectedWordSets: number[]
    selectedIdiomSets: number[]
    questionCount: number
}

/* ═══════════════════════════════════════
   방 설정 화면 (세트 멀티 선택)
   ═══════════════════════════════════════ */
function BattleCreateSettings({ onCancel, onCreate, creating, errorMsg }: {
    onCancel: () => void
    onCreate: (config: BattleConfig) => void
    creating: boolean
    errorMsg: string
}) {
    const supabase = createClient()
    const [level, setLevel] = useState<Level>('elem_3')
    const [wordSets, setWordSets] = useState<number[]>([])
    const [idiomSets, setIdiomSets] = useState<number[]>([])
    const [selectedWordSets, setSelectedWordSets] = useState<number[]>([])
    const [selectedIdiomSets, setSelectedIdiomSets] = useState<number[]>([])
    const [questionCount, setQuestionCount] = useState(10)
    const [isLoading, setIsLoading] = useState(true)

    const totalSelected = selectedWordSets.length + selectedIdiomSets.length
    const pointPerQ = (100 / questionCount).toFixed(1).replace(/\.0$/, '')

    useEffect(() => {
        let cancelled = false
        async function fetchSets() {
            setIsLoading(true)
            const { data } = await supabase
                .from('words')
                .select('set_no, type')
                .eq('level', level)
                .order('set_no', { ascending: true })

            if (cancelled) return
            const rows = data || []
            const wSets = [...new Set(rows.filter(d => d.type !== 'idiom').map(d => d.set_no))].sort((a, b) => a - b)
            const iSets = [...new Set(rows.filter(d => d.type === 'idiom').map(d => d.set_no))].sort((a, b) => a - b)
            setWordSets(wSets)
            setIdiomSets(iSets)
            setSelectedWordSets([])
            setSelectedIdiomSets([])
            setIsLoading(false)
        }
        fetchSets()
        return () => { cancelled = true }
    }, [level, supabase])

    function toggleWordSet(setNo: number) {
        setSelectedWordSets(prev =>
            prev.includes(setNo) ? prev.filter(s => s !== setNo) : [...prev, setNo].sort((a, b) => a - b)
        )
    }

    function toggleIdiomSet(setNo: number) {
        setSelectedIdiomSets(prev =>
            prev.includes(setNo) ? prev.filter(s => s !== setNo) : [...prev, setNo].sort((a, b) => a - b)
        )
    }

    function selectAll() {
        const allSelected = selectedWordSets.length === wordSets.length && selectedIdiomSets.length === idiomSets.length
        if (allSelected) {
            setSelectedWordSets([])
            setSelectedIdiomSets([])
        } else {
            setSelectedWordSets([...wordSets])
            setSelectedIdiomSets([...idiomSets])
        }
    }

    return (
        <motion.div
            className={styles.card}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
            <header className={styles.header}>
                <h1 className={styles.title}>⚙️ 배틀 설정</h1>
                <p className={styles.subtitle}>레벨, 세트, 문항수를 선택하세요</p>
            </header>

            {errorMsg && (
                <div className={styles.errorWrap}>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={styles.error}
                    >
                        {errorMsg}
                    </motion.div>
                </div>
            )}

            <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>레벨</label>
                <select
                    className={styles.settingSelect}
                    value={level}
                    onChange={e => setLevel(e.target.value as Level)}
                >
                    {LEVELS.map(l => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                </select>
            </div>

            <div className={styles.settingGroup}>
                <div className={styles.settingLabelRow}>
                    <label className={styles.settingLabel}>
                        세트 선택
                        {totalSelected > 0 && (
                            <span className={styles.selectedCount}>{totalSelected}개</span>
                        )}
                    </label>
                    <button className={styles.selectAllBtn} onClick={selectAll}>
                        {selectedWordSets.length === wordSets.length && selectedIdiomSets.length === idiomSets.length ? '전체 해제' : '전체 선택'}
                    </button>
                </div>

                {isLoading ? (
                    <div className={styles.setsLoading}>불러오는 중…</div>
                ) : wordSets.length === 0 && idiomSets.length === 0 ? (
                    <div className={styles.setsLoading}>세트가 없습니다</div>
                ) : (
                    <>
                        {wordSets.length > 0 && (
                            <>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6366f1', margin: '0.3rem 0 0.2rem' }}>
                                    단어 세트
                                </div>
                                <div className={styles.setsGrid}>
                                    {wordSets.map(setNo => (
                                        <button
                                            key={`w-${setNo}`}
                                            className={`${styles.setChip} ${selectedWordSets.includes(setNo) ? styles.setChipActive : ''}`}
                                            onClick={() => toggleWordSet(setNo)}
                                        >
                                            Set {setNo}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        {idiomSets.length > 0 && (
                            <>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#d97706', margin: '0.5rem 0 0.2rem' }}>
                                    숙어 세트
                                </div>
                                <div className={styles.setsGrid}>
                                    {idiomSets.map(setNo => (
                                        <button
                                            key={`i-${setNo}`}
                                            className={`${styles.setChip} ${selectedIdiomSets.includes(setNo) ? styles.setChipActive : ''}`}
                                            onClick={() => toggleIdiomSet(setNo)}
                                        >
                                            {getSetLabel('idiom', level, setNo)}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            <div className={styles.settingGroup}>
                <div className={styles.settingLabelRow}>
                    <label className={styles.settingLabel}>문항수</label>
                    <span className={styles.pointBadge}>문항당 {pointPerQ}점 (만점 100)</span>
                </div>
                <div className={styles.countRow}>
                    {QUESTION_COUNTS.map(n => (
                        <button
                            key={n}
                            className={`${styles.countChip} ${questionCount === n ? styles.countChipActive : ''}`}
                            onClick={() => setQuestionCount(n)}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.actionRow}>
                <button className={styles.btnCancel} onClick={onCancel} disabled={creating}>
                    취소
                </button>
                <button
                    className={styles.btnStart}
                    disabled={totalSelected === 0 || creating}
                    onClick={() => onCreate({ level, selectedWordSets, selectedIdiomSets, questionCount })}
                >
                    {creating ? '생성 중…' : '배틀 방 입장'}
                </button>
            </div>
        </motion.div>
    )
}

/* ═══════════════════════════════════════
   로비 메인
   ═══════════════════════════════════════ */
function LobbyContent() {
    const router = useRouter()
    const supabase = createClient()

    const [view, setView] = useState<'lobby' | 'settings'>('lobby')
    const [isPending, startTransition] = useTransition()
    const [joinCode, setJoinCode] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    // ── 방 만들기 (설정 화면에서 호출) ──
    async function handleCreate(config: BattleConfig) {
        startTransition(async () => {
            setErrorMsg('')

            const hostId = await getUserId(supabase)

            // 선택된 단어/숙어 세트에서 ID 가져오기
            const queries = []
            if (config.selectedWordSets.length > 0) {
                queries.push(
                    supabase.from('words').select('id')
                        .eq('level', config.level)
                        .in('set_no', config.selectedWordSets)
                        .neq('type', 'idiom')
                )
            }
            if (config.selectedIdiomSets.length > 0) {
                queries.push(
                    supabase.from('words').select('id')
                        .eq('level', config.level)
                        .in('set_no', config.selectedIdiomSets)
                        .eq('type', 'idiom')
                )
            }

            const results = await Promise.all(queries)
            const wordIds = results.flatMap(r => (r.data || []).map(w => w.id))

            if (wordIds.length === 0) {
                setErrorMsg('선택한 세트에 단어가 없습니다.')
                return
            }

            // Fisher-Yates 셔플
            for (let i = wordIds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [wordIds[i], wordIds[j]] = [wordIds[j], wordIds[i]]
            }

            const sliced = wordIds.slice(0, config.questionCount)
            const roomCode = generateRoomCode()
            const firstSetNo = config.selectedWordSets[0] ?? config.selectedIdiomSets[0] ?? 1

            // 서버 API로 방 생성 (service role → RLS 우회)
            const res = await fetch('/api/battle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    roomCode,
                    hostId,
                    level: config.level,
                    setNo: firstSetNo,
                    questionIds: sliced,
                    questionCount: config.questionCount,
                }),
            })

            const result = await res.json()

            if (!res.ok || result.error) {
                setErrorMsg(`방 생성 실패: ${result.error || '알 수 없는 오류'}`)
                return
            }

            router.push(`/battle/room/${result.id}`)
        })
    }

    // ── 방 입장하기 ──
    async function handleJoinRoom() {
        if (!joinCode || joinCode.length !== 6) {
            setErrorMsg('6자리 코드를 입력해주세요.')
            return
        }

        startTransition(async () => {
            setErrorMsg('')

            const odlId = await getUserId(supabase)

            // 방 코드로 방 조회 (SELECT은 RLS가 true이므로 anon도 가능)
            const { data: room, error: findError } = await supabase
                .from('battle_rooms')
                .select('id, participant_ids, max_players, status')
                .eq('room_code', joinCode.toUpperCase())
                .single()

            if (findError || !room) {
                setErrorMsg('존재하지 않는 방 코드입니다.')
                return
            }

            if (room.status !== 'waiting') {
                setErrorMsg('이미 게임이 진행 중이거나 종료된 방입니다.')
                return
            }

            if (room.participant_ids?.includes(odlId)) {
                router.push(`/battle/room/${room.id}`)
                return
            }

            // 서버 API로 입장 (service role → RLS 우회)
            const res = await fetch('/api/battle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'join',
                    roomId: room.id,
                    userId: odlId,
                }),
            })

            const result = await res.json()
            if (!res.ok || result.error) {
                setErrorMsg(`입장 실패: ${result.error}`)
                return
            }

            router.push(`/battle/room/${room.id}`)
        })
    }

    return (
        <>
            <div className={styles.blob1} />
            <div className={styles.blob2} />

            <AnimatePresence mode="wait">
                {view === 'settings' ? (
                    <BattleCreateSettings
                        key="settings"
                        onCancel={() => { setView('lobby'); setErrorMsg('') }}
                        onCreate={handleCreate}
                        creating={isPending}
                        errorMsg={errorMsg}
                    />
                ) : (
                    <motion.div
                        key="lobby"
                        className={styles.card}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                        <header className={styles.header}>
                            <h1 className={styles.title}>🏆 배틀 로비</h1>
                        </header>

                        {errorMsg && (
                            <div className={styles.errorWrap}>
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className={styles.error}
                                >
                                    {errorMsg}
                                </motion.div>
                            </div>
                        )}

                        <button
                            className={styles.btnCreate}
                            onClick={() => { setView('settings'); setErrorMsg('') }}
                            disabled={isPending}
                        >
                            ⚔️ 방 만들기
                        </button>

                        <div className={styles.divider} />

                        <div className={styles.joinRow}>
                            <input
                                type="text"
                                maxLength={6}
                                placeholder="6자리 코드"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                className={styles.codeInput}
                                disabled={isPending}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                            />
                            <button
                                className={styles.btnJoin}
                                onClick={handleJoinRoom}
                                disabled={isPending || joinCode.length !== 6}
                            >
                                입장하기
                            </button>
                        </div>

                        <button className={styles.btnBack} onClick={() => router.push('/study')}>
                            ← 돌아가기
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

export default function BattleLobbyPage() {
    return (
        <div className={styles.page}>
            <Suspense fallback={<div className={styles.loader}>로딩 중...</div>}>
                <LobbyContent />
            </Suspense>
        </div>
    )
}
