'use client'

import { useState, useEffect, useTransition, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Level, Word } from '@/types/vocabulary'
import { getSetLabel } from '@/lib/setAliases'
import { TIER_LEVELS } from '@/lib/tierSystem'
import styles from './setup.module.css'

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
    const [wordSets, setWordSets] = useState<number[]>([])
    const [idiomSets, setIdiomSets] = useState<number[]>([])
    const [setsLoading, setSetsLoading] = useState(false)
    // 선택된 세트 번호들 (다중 선택)
    const [selectedWordSets, setSelectedWordSets] = useState<number[]>([])
    const [selectedIdiomSets, setSelectedIdiomSets] = useState<number[]>([])
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
        setSelectedWordSets([])
        setSelectedIdiomSets([])
        setFetchError('')

        const supabaseFetch = async () => {
            const { data, error } = await supabase
                .from('words')
                .select('set_no, type')
                .eq('level', level)
                .order('set_no', { ascending: true })

            if (error || !data) {
                setWordSets([])
                setIdiomSets([])
                setSetsLoading(false)
                return
            }

            const wSets = [...new Set(data.filter(d => d.type !== 'idiom').map(d => d.set_no))].sort((a, b) => a - b)
            const iSets = [...new Set(data.filter(d => d.type === 'idiom').map(d => d.set_no))].sort((a, b) => a - b)
            setWordSets(wSets)
            setIdiomSets(iSets)
            setSetsLoading(false)
        }

        supabaseFetch()
    }, [level])  // eslint-disable-line react-hooks/exhaustive-deps

    // ── 세트 토글 (체크박스 다중 선택) ───────────────────────
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

    // ── 유효성: 세트가 1개 이상 선택돼야 시작 가능 ────────────
    const isValid = selectedWordSets.length + selectedIdiomSets.length > 0
    const selectedSetsCount = selectedWordSets.length + selectedIdiomSets.length
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

            // 선택된 단어/숙어 세트에서 데이터 가져오기
            const queries = []
            if (selectedWordSets.length > 0) {
                queries.push(
                    supabase.from('words').select('*')
                        .eq('level', level)
                        .in('set_no', selectedWordSets)
                        .neq('type', 'idiom')
                        .order('id')
                )
            }
            if (selectedIdiomSets.length > 0) {
                queries.push(
                    supabase.from('words').select('*')
                        .eq('level', level)
                        .in('set_no', selectedIdiomSets)
                        .eq('type', 'idiom')
                        .order('id')
                )
            }

            const results = await Promise.all(queries)
            const allData = results.flatMap(r => r.data || [])

            if (allData.length === 0) {
                setFetchError('단어 데이터를 불러오지 못했습니다. 다시 시도해주세요.')
                return
            }

            const words = allData as Word[]

            // 단어 수가 문항수보다 적으면 전체 사용
            const count = Math.min(questionCount, words.length)
            const battleWords = sampleSize(words, count)

            // 설정값을 sessionStorage에 저장 → 대기실에서 사용
            sessionStorage.setItem(
                'battleSetup',
                JSON.stringify({
                    level,
                    selectedWordSets,
                    selectedIdiomSets,
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
                    set_no: selectedWordSets[0] ?? selectedIdiomSets[0] ?? 1,
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
                    <p className={styles.subtitle}>티어, 세트, 출제 조건을 설정하세요</p>
                </header>

                {/* ① 티어 선택 */}
                <section className={styles.section}>
                    <p className={styles.sectionLabel}>① 티어 선택</p>
                    <div className={styles.selectWrapper}>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value as Level)}
                            className={styles.levelSelect}
                        >
                            {TIER_LEVELS.map(lv => (
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
                    ) : wordSets.length === 0 && idiomSets.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                            세트 데이터가 없습니다.
                        </p>
                    ) : (
                        <>
                            {wordSets.length > 0 && (
                                <>
                                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#818cf8', margin: '0.3rem 0 0.2rem' }}>단어 세트</p>
                                    <div className={styles.setGrid}>
                                        {wordSets.map(setNo => (
                                            <div className={styles.setChk} key={`w-${setNo}`}>
                                                <input
                                                    type="checkbox"
                                                    id={`wset-${setNo}`}
                                                    checked={selectedWordSets.includes(setNo)}
                                                    onChange={() => toggleWordSet(setNo)}
                                                />
                                                <label htmlFor={`wset-${setNo}`}>
                                                    {setNo}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            {idiomSets.length > 0 && (
                                <>
                                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', margin: '0.5rem 0 0.2rem' }}>숙어 세트</p>
                                    <div className={styles.setGrid}>
                                        {idiomSets.map(setNo => (
                                            <div className={styles.setChk} key={`i-${setNo}`}>
                                                <input
                                                    type="checkbox"
                                                    id={`iset-${setNo}`}
                                                    checked={selectedIdiomSets.includes(setNo)}
                                                    onChange={() => toggleIdiomSet(setNo)}
                                                />
                                                <label htmlFor={`iset-${setNo}`}>
                                                    {getSetLabel('idiom', level, setNo)}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    <p className={styles.selectionInfo}>
                        {(selectedWordSets.length + selectedIdiomSets.length) > 0 && (
                            <>
                                {selectedWordSets.length > 0 && `단어 Set ${selectedWordSets.join(', ')}`}
                                {selectedWordSets.length > 0 && selectedIdiomSets.length > 0 && ' / '}
                                {selectedIdiomSets.length > 0 && `숙어 Set ${selectedIdiomSets.join(', ')}`}
                                {` (${selectedWordSets.length + selectedIdiomSets.length}개)`}
                            </>
                        )}
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
