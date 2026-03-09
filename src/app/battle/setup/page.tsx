'use client'

import { useState, useEffect, useTransition, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Level, Word } from '@/types/vocabulary'
import styles from './setup.module.css'

// ── 상수 ──────────────────────────────────────────────────────
const LEVELS: { value: Level; label: string }[] = [
    { value: 'elem_3', label: '초등 3학년' },
    { value: 'elem_4', label: '초등 4학년' },
    { value: 'elem_5', label: '초등 5학년' },
    { value: 'elem_6', label: '초등 6학년' },
    { value: 'mid_1', label: '중등 1학년' },
    { value: 'mid_2', label: '중등 2학년' },
    { value: 'mid_3', label: '중등 3학년' },
    { value: 'high_1', label: '고등 1학년' },
    { value: 'high_2', label: '고등 2학년' },
]

const COUNT_OPTIONS = [10, 20, 30] as const

// 선택된 단어 풀에서 count개 랜덤 추출 (lodash 없이 Fisher-Yates)
function sampleSize<T>(arr: T[], count: number): T[] {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count)
}

// ── 설정 페이지 본체 ──────────────────────────────────────────
function SetupContent() {
    const router = useRouter()
    const supabase = createClient()

    // 학년 선택
    const [level, setLevel] = useState<Level>('elem_3')
    // 해당 학년에서 사용 가능한 세트 번호 목록
    const [availableSets, setAvailableSets] = useState<number[]>([])
    const [setsLoading, setSetsLoading] = useState(false)
    // 선택된 세트 번호들 (다중 선택)
    const [selectedSets, setSelectedSets] = useState<number[]>([])
    // 문항수
    const [questionCount, setQuestionCount] = useState<10 | 20 | 30>(10)
    // 문항당 배점
    const [pointsPerQ, setPointsPerQ] = useState(10)
    // 최대 인원 (최대 50명)
    const [maxPlayers, setMaxPlayers] = useState(10)
    // 마감 시간 (분 단위, 최대 1분) - 요구사항은 '최대 1분'이므로 초 단위로 관리하거나 1분 고정 가능. 
    // 여기서는 초단위 10, 30, 60초 옵션 제공
    const [timeLimit, setTimeLimit] = useState(60)

    const [isPending, startTransition] = useTransition()
    const [fetchError, setFetchError] = useState('')

    // ── 학년 바뀌면 세트 목록 로드 ────────────────────────────
    useEffect(() => {
        setSetsLoading(true)
        setSelectedSets([])
        setFetchError('')

        const supabaseFetch = async () => {
            const { data, error } = await supabase
                .from('words')
                .select('set_no')
                .eq('level', level)
                .order('set_no', { ascending: true })

            if (error || !data) {
                setAvailableSets([])
                setSetsLoading(false)
                return
            }

            const unique = Array.from(new Set(data.map(d => d.set_no))) as number[]
            setAvailableSets(unique)
            setSetsLoading(false)
        }

        supabaseFetch()
    }, [level])  // eslint-disable-line react-hooks/exhaustive-deps

    // ── 세트 토글 (체크박스 다중 선택) ───────────────────────
    function toggleSet(setNo: number) {
        setSelectedSets(prev =>
            prev.includes(setNo)
                ? prev.filter(s => s !== setNo)
                : [...prev, setNo].sort((a, b) => a - b)
        )
    }

    // ── 유효성: 세트가 1개 이상 선택돼야 시작 가능 ────────────
    const isValid = selectedSets.length > 0
    const totalScore = questionCount * pointsPerQ

    // ── 배틀 시작 (방 생성 → 바로 대기실로) ───────────────────
    async function handleStart() {
        if (!isValid) return
        setFetchError('')

        startTransition(async () => {
            // 로그인 확인
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user) {
                setFetchError('로그인이 필요합니다. 먼저 로그인해 주세요.')
                return
            }

            // 선택된 모든 세트 단어 한 번에 가져오기
            const { data, error } = await supabase
                .from('words')
                .select('*')
                .eq('level', level)
                .in('set_no', selectedSets)
                .order('id')

            if (error || !data || data.length === 0) {
                setFetchError('단어 데이터를 불러오지 못했습니다. 다시 시도해주세요.')
                return
            }

            const words = data as Word[]

            // 단어 수가 문항수보다 적으면 전체 사용
            const count = Math.min(questionCount, words.length)
            const battleWords = sampleSize(words, count)

            // 설정값을 sessionStorage에 저장 → 대기실에서 사용
            sessionStorage.setItem(
                'battleSetup',
                JSON.stringify({
                    level,
                    selectedSets,
                    questionCount,
                    pointsPerQ,
                    totalScore,
                    maxPlayers,
                    timeLimit,
                    battleWords,
                })
            )

            // 방 생성
            const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
            const expiresAt = new Date(Date.now() + timeLimit * 1000).toISOString()

            const { data: room, error: roomError } = await supabase
                .from('battle_rooms')
                .insert({
                    room_code: roomCode,
                    host_id: user.id,
                    level,
                    set_no: selectedSets[0],
                    status: 'waiting',
                    max_players: maxPlayers,
                    expires_at: expiresAt,
                })
                .select('id')
                .single()

            if (roomError || !room) {
                console.error('Room Creation Error:', roomError)
                setFetchError('방 생성에 실패했습니다.')
                return
            }

            // 방장을 첫 참가자로 등록
            await supabase
                .from('battle_participants')
                .insert({ room_id: room.id, user_id: user.id, is_ready: true })

            // 대기실로 바로 이동
            router.push(`/battle/room/${room.id}`)
        })
    }

    return (
        <>
            <div className={styles.blob1} />
            <div className={styles.blob2} />

            <motion.div
                className={styles.card}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
                {/* 헤더 */}
                <header className={styles.header}>
                    <h1 className={styles.title}>⚙️ 배틀 설정</h1>
                    <p className={styles.subtitle}>단어 범위와 출제 조건을 설정하세요</p>
                </header>

                {/* ① 학년 선택 */}
                <section className={styles.section}>
                    <p className={styles.sectionLabel}>① 학년 선택</p>
                    <div className={styles.selectWrapper}>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value as Level)}
                            className={styles.levelSelect}
                        >
                            {LEVELS.map(lv => (
                                <option key={lv.value} value={lv.value}>
                                    {lv.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </section>

                {/* ② 세트 다중 선택 */}
                <section className={styles.section}>
                    <p className={styles.sectionLabel}>② 세트 선택 (복수 선택 가능)</p>

                    {setsLoading ? (
                        <div className={styles.setLoadingRow}>
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={styles.setLoadingItem} />
                            ))}
                        </div>
                    ) : availableSets.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                            세트 데이터가 없습니다.
                        </p>
                    ) : (
                        <div className={styles.setGrid}>
                            {availableSets.map(setNo => (
                                <div className={styles.setChk} key={setNo}>
                                    <input
                                        type="checkbox"
                                        id={`set-${setNo}`}
                                        checked={selectedSets.includes(setNo)}
                                        onChange={() => toggleSet(setNo)}
                                    />
                                    <label htmlFor={`set-${setNo}`}>
                                        {setNo}
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}

                    <p className={styles.selectionInfo}>
                        {selectedSets.length > 0 && `Set ${selectedSets.join(', ')} 선택됨 (${selectedSets.length}개)`}
                    </p>
                </section>

                <div className={styles.divider} />

                {/* ③ 문항수 */}
                <section className={styles.section}>
                    <p className={styles.sectionLabel}>③ 문항수</p>
                    <div className={styles.countGroup}>
                        {COUNT_OPTIONS.map(n => (
                            <button
                                key={n}
                                className={`${styles.countBtn} ${questionCount === n ? styles.active : ''}`}
                                onClick={() => setQuestionCount(n)}
                            >
                                {n}문항
                            </button>
                        ))}
                    </div>
                </section>

                {/* ④ 배점 */}
                <section className={styles.section}>
                    <p className={styles.sectionLabel}>④ 배점 설정</p>
                    <div className={styles.pointsRow}>
                        <span className={styles.pointsLabel}>문항당 배점</span>
                        <input
                            id="points-per-q"
                            type="number"
                            className={styles.pointsInput}
                            min={1}
                            max={100}
                            value={pointsPerQ}
                            onChange={e => {
                                const v = Number(e.target.value)
                                if (v >= 1 && v <= 100) setPointsPerQ(v)
                            }}
                        />
                        <span className={styles.pointsSuffix}>점</span>
                    </div>
                </section>

                {/* ⑤ 최대 인원 */}
                <section className={styles.section}>
                    <p className={styles.sectionLabel}>⑤ 최대 인원 설정 (최대 50명)</p>
                    <div className={styles.pointsRow}>
                        <span className={styles.pointsLabel}>참여 가능 인원</span>
                        <input
                            type="number"
                            className={styles.pointsInput}
                            min={2}
                            max={50}
                            value={maxPlayers}
                            onChange={e => {
                                const v = Number(e.target.value)
                                if (v >= 2 && v <= 50) setMaxPlayers(v)
                            }}
                        />
                        <span className={styles.pointsSuffix}>명</span>
                    </div>
                </section>

                {/* ⑥ 마감 시간 */}
                <section className={styles.section}>
                    <p className={styles.sectionLabel}>⑥ 입장 마감 시간 (최대 60초)</p>
                    <div className={styles.countGroup}>
                        {[10, 30, 60].map(s => (
                            <button
                                key={s}
                                className={`${styles.countBtn} ${timeLimit === s ? styles.active : ''}`}
                                onClick={() => setTimeLimit(s)}
                            >
                                {s}초
                            </button>
                        ))}
                    </div>
                </section>

                <div className={styles.divider} />

                <p className={styles.totalScore}>
                    총 {questionCount}문항 / {maxPlayers}명 / {timeLimit}초 대기
                </p>

                <div className={styles.divider} />

                {/* 오류 메시지 */}
                {fetchError && (
                    <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                        {fetchError}
                    </p>
                )}

                {/* 배틀 시작 버튼 */}
                <motion.button
                    id="battle-start-btn"
                    className={styles.startBtn}
                    onClick={handleStart}
                    disabled={!isValid || isPending}
                    whileTap={isValid ? { scale: 0.96 } : {}}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                    {isPending ? '⏳ 단어 불러오는 중…' : '🏆 배틀 시작하기'}
                </motion.button>

                <button className={styles.backBtn} onClick={() => router.push('/study')}>
                    ← 학습 페이지로 돌아가기
                </button>
            </motion.div>
        </>
    )
}

// ── 페이지 래퍼 ──────────────────────────────────────────────
export default function BattleSetupPage() {
    return (
        <div className={styles.page}>
            <Suspense fallback={<div className={styles.loader}>로딩 중…</div>}>
                <SetupContent />
            </Suspense>
        </div>
    )
}
