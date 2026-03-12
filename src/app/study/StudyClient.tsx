'use client'

import { useState, useCallback, useTransition, useEffect, useRef } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Word, Level } from '@/types/vocabulary'
import { getSetLabel } from '@/lib/setAliases'
import { TIER_LEVELS } from '@/lib/tierSystem'
import styles from './study.module.css'
import { useRouter, useSearchParams } from 'next/navigation'
import QuizClient from './QuizClient'
import MasterChallengeClient from './MasterChallengeClient'
import WrongWordsClient from './WrongWordsClient'
import BattleFeed from '@/components/BattleFeed'

type Tab = 'study' | 'quiz' | 'wrong' | 'master'

interface Props { initialWords: Word[]; initialMaxSet: number }

function speak(word: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(word)
    utter.lang = 'en-US'
    utter.rate = 0.7
    const usVoice = window.speechSynthesis.getVoices().find(v => v.lang === 'en-US')
    if (usVoice) utter.voice = usVoice
    window.speechSynthesis.speak(utter)
}

/* 공통 motion 프리셋 */
const fadeUp = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } }
const spring: Transition = { type: 'spring', stiffness: 420, damping: 30 }

export default function StudyClient({ initialWords, initialMaxSet }: Props) {
    const supabase = createClient()
    const router = useRouter()
    // 환영 오버레이
    const searchParams = useSearchParams()
    const welcomeParam = searchParams.get('welcome')
    const [showWelcome, setShowWelcome] = useState(false)
    const [welcomeName, setWelcomeName] = useState<string | null>(null)

    useEffect(() => {
        if (!welcomeParam) return
        setWelcomeName(welcomeParam)
        setShowWelcome(true)
        window.history.replaceState({}, '', '/study')
        const timer = setTimeout(() => setShowWelcome(false), 1800)
        return () => clearTimeout(timer)
    }, [welcomeParam])

    const [tab, setTab] = useState<Tab>('study')
    const [level, setLevel] = useState<Level | null>(null)
    const [setNo, setSetNo] = useState<number | null>(null)
    const [setType, setSetType] = useState<string>('word')
    const [availableSets, setAvailableSets] = useState<{ setNo: number; type: string }[]>([])
    const [words, setWords] = useState<Word[]>([])
    const isReady = level !== null && setNo !== null

    // 세트별 진도 (localStorage 기반)
    const [setProgressMap, setSetProgressMap] = useState<Record<string, number>>({})
    // 커스텀 세트 드롭다운 열림 상태
    const [setDropdownOpen, setSetDropdownOpen] = useState(false)
    const setDropdownRef = useRef<HTMLDivElement>(null)

    // 성공 횟수 & 메달 (level+set 별 localStorage 저장)
    const [successCount, setSuccessCount] = useState(0)
    const [medalCount, setMedalCount] = useState(0)

    const progressKey = level && setNo !== null ? `progress_${level}_${setType}_${setNo}` : null

    // level+set 변경 시 저장된 성공/메달 불러오기
    useEffect(() => {
        if (!progressKey) return
        try {
            const saved = JSON.parse(localStorage.getItem(progressKey) || '{}')
            setSuccessCount(saved.success ?? 0)
            setMedalCount(saved.medal ?? 0)
        } catch { setSuccessCount(0); setMedalCount(0) }
    }, [progressKey])

    // 세트 목록이 바뀌면 각 세트의 진도를 localStorage에서 불러오기
    useEffect(() => {
        if (!level || availableSets.length === 0) return
        const map: Record<string, number> = {}
        for (const s of availableSets) {
            const key = `progress_${level}_${s.type === 'idiom' ? 'idiom' : 'word'}_${s.setNo}`
            try {
                const saved = JSON.parse(localStorage.getItem(key) || '{}')
                map[`${s.type === 'idiom' ? 'idiom' : 'word'}:${s.setNo}`] = saved.success ?? 0
            } catch { map[`${s.type === 'idiom' ? 'idiom' : 'word'}:${s.setNo}`] = 0 }
        }
        setSetProgressMap(map)
    }, [level, availableSets])

    // 현재 세트 진도 변경 시 맵도 동기화
    useEffect(() => {
        if (!progressKey || setNo === null) return
        const mapKey = `${setType}:${setNo}`
        setSetProgressMap(prev => ({ ...prev, [mapKey]: successCount }))
    }, [successCount, progressKey, setNo, setType])

    // 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (setDropdownRef.current && !setDropdownRef.current.contains(e.target as Node)) {
                setSetDropdownOpen(false)
            }
        }
        if (setDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [setDropdownOpen])

    function saveProgress(success: number, medal: number) {
        if (!progressKey) return
        localStorage.setItem(progressKey, JSON.stringify({ success, medal }))
    }

    function handleQuizFinish(score: number, total: number) {
        const pct = Math.round((score / total) * 100)
        if (pct >= 90) {
            const next = Math.min(successCount + 1, 3)
            setSuccessCount(next)
            saveProgress(next, medalCount)
        }
    }

    function handleMasterSuccess() {
        const nextMedal = medalCount + 1
        setMedalCount(nextMedal)
        setSuccessCount(0)
        saveProgress(0, nextMedal)
        setTab('study')
    }
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = () => { }
        }
    }, [])

    const prevIndexRef = useRef<number>(-1)
    const prevFlippedRef = useRef(false)

    useEffect(() => {
        const word = words[currentIndex]?.word
        if (!word || prevIndexRef.current === currentIndex) return
        prevIndexRef.current = currentIndex
        speak(word)
    }, [currentIndex, words])

    useEffect(() => {
        if (prevFlippedRef.current === true && isFlipped === false) {
            const word = words[currentIndex]?.word
            if (word) speak(word)
        }
        prevFlippedRef.current = isFlipped
    }, [isFlipped]) // eslint-disable-line react-hooks/exhaustive-deps

    async function changeLevel(newLevel: Level | null) {
        if (!newLevel) return
        setLevel(newLevel)
        setSetNo(null)
        setWords([])
        startTransition(async () => {
            const { data: rangeData } = await supabase
                .from('words')
                .select('set_no, type')
                .eq('level', newLevel)
                .order('set_no', { ascending: true })

            if (!rangeData || rangeData.length === 0) {
                setAvailableSets([])
                return
            }

            // (set_no, type) 쌍으로 중복 제거
            const seen = new Set<string>()
            const sets: { setNo: number; type: string }[] = []
            for (const d of rangeData) {
                const key = `${d.type}:${d.set_no}`
                if (!seen.has(key)) {
                    seen.add(key)
                    sets.push({ setNo: d.set_no, type: d.type || 'word' })
                }
            }
            setAvailableSets(sets)
        })
    }

    const changeSet = useCallback(async (val: string) => {
        if (!val || !level) return
        // val 형식: "word:1" 또는 "idiom:2"
        const [type, no] = val.split(':')
        const newSetNo = Number(no)
        setSetNo(newSetNo)
        setSetType(type)
        startTransition(async () => {
            let query = supabase.from('words').select('*').eq('level', level).eq('set_no', newSetNo)
            if (type === 'idiom') {
                query = query.eq('type', 'idiom')
            } else {
                query = query.neq('type', 'idiom')
            }
            const { data } = await query.order('id')
            setWords((data ?? []) as Word[])
            prevIndexRef.current = -1
            setCurrentIndex(0)
            setIsFlipped(false)
        })
    }, [level]) // eslint-disable-line react-hooks/exhaustive-deps

    const current = words[currentIndex]
    const meanings = [current?.mean_1, current?.mean_2, current?.mean_3].filter(Boolean)
    const progress = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0

    return (
        <div className={styles.page}>
            {/* 환영 오버레이 */}
            <AnimatePresence>
                {showWelcome && (
                    <motion.div
                        className={styles.welcomeOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <motion.div
                            className={styles.welcomeContent}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={spring}
                        >
                            <div className={styles.welcomeLogo}>입시보카</div>
                            <div className={styles.welcomeGreeting}>{welcomeName}님, 환영합니다!</div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <BattleFeed />
            {/* 벤토 그리드 */}
            <div className={styles.bento}>

                {/* 컨트롤 영역 (3줄 구조) */}
                <motion.div
                    className={`${styles.glass} ${styles.controlsWrap}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.08 } as Transition}
                >
                    {/* 1줄: 학년 & 세트 선택 */}
                    <div className={styles.selectRow}>
                        <select value={level ?? ''} onChange={e => changeLevel((e.target.value || null) as Level | null)} disabled={isPending}>
                            <option value="" disabled>Tier 선택</option>
                            {TIER_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                        <div className={styles.setDropdownWrap} ref={setDropdownRef}>
                            <button
                                className={styles.setDropdownBtn}
                                onClick={() => level && !isPending && setSetDropdownOpen(v => !v)}
                                disabled={isPending || !level}
                                type="button"
                            >
                                <span>{setNo !== null ? getSetLabel(setType === 'idiom' ? 'idiom' : 'word', level!, setNo) : 'Set 선택'}</span>
                                <span className={`${styles.setDropdownArrow} ${setDropdownOpen ? styles.setDropdownArrowOpen : ''}`}>&#9662;</span>
                            </button>
                            {setDropdownOpen && level && (() => {
                                const wSets = availableSets.filter(s => s.type !== 'idiom')
                                const iSets = availableSets.filter(s => s.type === 'idiom')
                                return (
                                    <div className={styles.setDropdownPanel}>
                                        {wSets.map(s => {
                                            const key = `word:${s.setNo}`
                                            const sc = setProgressMap[key] ?? 0
                                            const isSelected = setType === 'word' && setNo === s.setNo
                                            return (
                                                <button
                                                    key={`w-${s.setNo}`}
                                                    className={`${styles.setDropdownItem} ${isSelected ? styles.setDropdownItemActive : ''}`}
                                                    onClick={() => { changeSet(key); setSetDropdownOpen(false) }}
                                                    type="button"
                                                >
                                                    <span className={styles.setDropdownLabel}>{getSetLabel('word', level, s.setNo)}</span>
                                                    <span className={styles.setDropdownDots}>
                                                        ({[0, 1, 2].map(i => (
                                                            <span key={i} className={`${styles.setDot} ${i < sc ? styles.setDotFilled : ''}`} />
                                                        ))})
                                                    </span>
                                                </button>
                                            )
                                        })}
                                        {iSets.length > 0 && iSets.map(s => {
                                            const key = `idiom:${s.setNo}`
                                            const sc = setProgressMap[key] ?? 0
                                            const isSelected = setType === 'idiom' && setNo === s.setNo
                                            return (
                                                <button
                                                    key={`i-${s.setNo}`}
                                                    className={`${styles.setDropdownItem} ${isSelected ? styles.setDropdownItemActive : ''}`}
                                                    onClick={() => { changeSet(key); setSetDropdownOpen(false) }}
                                                    type="button"
                                                >
                                                    <span className={styles.setDropdownLabel}>{getSetLabel('idiom', level, s.setNo)}</span>
                                                    <span className={styles.setDropdownDots}>
                                                        ({[0, 1, 2].map(i => (
                                                            <span key={i} className={`${styles.setDot} ${i < sc ? styles.setDotFilled : ''}`} />
                                                        ))})
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )
                            })()}
                        </div>
                    </div>

                    {/* 2줄: 주요 액션 버튼 */}
                    <div className={styles.actionRow}>
                        <button
                            className={styles.battleBtn}
                            onClick={() => router.push(`/battle/lobby${level ? `?level=${level}&setNo=${setNo}` : ''}`)}
                        >
                            🏆 배틀 참여
                        </button>
                        <button
                            className={styles.reportBtn}
                            onClick={() => router.push('/report')}
                        >
                            📊 주간 리포트
                        </button>
                    </div>

                    {/* 성공 횟수 & 메달 */}
                    {isReady && (
                        <div className={styles.progressStatus}>
                            <div className={styles.successDots}>
                                <span className={styles.statusLabel}>테스트</span>
                                {[0, 1, 2].map(i => (
                                    <span key={i} className={`${styles.dot} ${i < successCount ? styles.dotFilled : ''}`} />
                                ))}
                                <span className={styles.successText}>{successCount}/3</span>
                                {successCount >= 3 && (
                                    <motion.button
                                        className={styles.masterBtn}
                                        onClick={() => setTab('master')}
                                        whileTap={{ scale: 0.93 }}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                    >
                                        마스터 챌린지 도전!
                                    </motion.button>
                                )}
                            </div>
                            {medalCount > 0 && (
                                <div className={styles.medalDisplay}>
                                    <span className={styles.medalIcon}>🏅</span>
                                    <span className={styles.medalCount}>{medalCount}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 탭 메뉴 (학년+세트 선택 후에만 표시) */}
                    {isReady ? (
                        <div className={styles.tabs}>
                            {(['study', 'quiz', 'wrong'] as Tab[]).map(t => (
                                <motion.button
                                    key={t}
                                    className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`}
                                    onClick={() => setTab(t)}
                                    disabled={t === 'quiz' && words.length === 0}
                                    whileTap={{ scale: 0.93 }}
                                    transition={spring}
                                >
                                    {t === 'study' ? '📖 학습' : t === 'quiz' ? '✏️ 테스트' : '📝 오답노트'}
                                </motion.button>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.selectHint}>
                            {!level ? '티어와 세트를 선택하세요' : '세트를 선택하세요'}
                        </p>
                    )}
                </motion.div>

                {/* 선택 전 빈 카드 + 네비게이션 */}
                {!isReady && (
                    <motion.div
                        key="placeholder"
                        {...fadeUp}
                        transition={{ ...spring, delay: 0.05 } as Transition}
                    >
                        {/* 빈 플래시카드 */}
                        <motion.div
                            className={styles.cardWrap}
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={spring}
                            style={{ margin: '0.5rem 0' }}
                        >
                            <div className={styles.card}>
                                <div className={`${styles.cardFace} ${styles.cardFront}`}>
                                    <span className={styles.wordText} style={{ opacity: 0.25 }}>?</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* 이전 / 다음 (비활성) */}
                        <div className={`${styles.glass} ${styles.nav}`}>
                            <motion.button
                                className={styles.navBtn}
                                disabled
                                whileTap={{ scale: 0.93 }}
                                transition={spring}
                            >← 이전</motion.button>
                            <motion.button
                                className={styles.navBtn}
                                disabled
                                whileTap={{ scale: 0.93 }}
                                transition={spring}
                            >다음 →</motion.button>
                        </div>
                    </motion.div>
                )}

                {/* 탭 콘텐츠 (학년+세트 선택 후에만 표시) */}
                {isReady && <AnimatePresence mode="wait">
                    {tab === 'study' ? (
                        /* ── 학습 탭 ── */
                        isPending ? (
                            <motion.div key="loading" {...fadeUp} className={`${styles.glass} ${styles.empty}`}>
                                로딩 중…
                            </motion.div>
                        ) : words.length === 0 ? (
                            <motion.div key="empty" {...fadeUp} className={`${styles.glass} ${styles.empty}`}>
                                단어가 없습니다.<br />
                                <small style={{ fontSize: '0.8rem', opacity: 0.6 }}>Supabase SQL Editor에서 seed.sql을 실행해주세요.</small>
                            </motion.div>
                        ) : (
                            <motion.div key="study-content" {...fadeUp} transition={{ ...spring, delay: 0.05 } as Transition}>
                                {/* 진행 바 */}
                                <div className={`${styles.glass} ${styles.progressRow}`}>
                                    <div className={styles.progressBar}>
                                        <motion.div
                                            className={styles.progressFill}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.4 }}
                                        />
                                    </div>
                                    <span className={styles.progressText}>{currentIndex + 1} / {words.length}</span>
                                </div>

                                {/* 플래시카드 */}
                                <motion.div
                                    key={currentIndex}
                                    className={styles.cardWrap}
                                    initial={{ opacity: 0, scale: 0.92 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={spring}
                                    style={{ margin: '0.5rem 0' }}
                                >
                                    <div
                                        className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}
                                        onClick={() => setIsFlipped(v => !v)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={e => e.key === 'Enter' && setIsFlipped(v => !v)}
                                    >
                                        {/* 앞면 */}
                                        <div className={`${styles.cardFace} ${styles.cardFront}`}>
                                            <span className={styles.wordText} style={
                                                current.type === 'idiom'
                                                    ? { fontSize: '1.6rem', whiteSpace: 'normal', wordBreak: 'keep-all', lineHeight: 1.4, textAlign: 'center' }
                                                    : undefined
                                            }>{current.word}</span>
                                            <motion.button
                                                className={styles.speakBtn}
                                                onClick={e => { e.stopPropagation(); speak(current.word) }}
                                                whileTap={{ scale: 0.85 }}
                                                title="발음 듣기"
                                            >🔊</motion.button>
                                        </div>
                                        {/* 뒷면 */}
                                        <div className={`${styles.cardFace} ${styles.cardBack}`}>
                                            <div className={styles.meaningText}>
                                                {meanings.map((m, i) => <div key={i}>{m}</div>)}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* 힌트 */}
                                <p className={styles.hint}>
                                    {isFlipped ? '🔄 다시 클릭하면 단어로 돌아갑니다' : '👆 카드를 클릭하면 뜻이 보입니다'}
                                </p>

                                {/* 이전 / 다음 */}
                                <div className={`${styles.glass} ${styles.nav}`}>
                                    <motion.button
                                        className={styles.navBtn}
                                        onClick={() => { setCurrentIndex(i => i - 1); setIsFlipped(false) }}
                                        disabled={currentIndex === 0}
                                        whileTap={{ scale: 0.93 }}
                                        transition={spring}
                                    >← 이전</motion.button>
                                    <motion.button
                                        className={styles.navBtn}
                                        onClick={() => { setCurrentIndex(i => i + 1); setIsFlipped(false) }}
                                        disabled={currentIndex === words.length - 1}
                                        whileTap={{ scale: 0.93 }}
                                        transition={spring}
                                    >다음 →</motion.button>
                                </div>
                            </motion.div>
                        )
                    ) : tab === 'quiz' ? (
                        /* ── 퀴즈 탭 ── */
                        words.length < 4 ? (
                            <motion.div key="quiz-empty" {...fadeUp} className={`${styles.glass} ${styles.empty}`}>
                                퀴즈는 단어가 최소 4개 이상 필요합니다.
                            </motion.div>
                        ) : (
                            <motion.div key="quiz-content" {...fadeUp} transition={{ ...spring } as Transition}>
                                <QuizClient key={`${level}-${setNo}`} words={words} onExit={() => setTab('study')} onFinish={handleQuizFinish} />
                            </motion.div>
                        )
                    ) : tab === 'wrong' ? (
                        /* ── 오답노트 탭 ── */
                        <motion.div key="wrong-content" {...fadeUp} transition={{ ...spring } as Transition}>
                            <WrongWordsClient onExit={() => setTab('study')} />
                        </motion.div>
                    ) : tab === 'master' ? (
                        /* ── 마스터 챌린지 탭 ── */
                        <motion.div key="master-content" {...fadeUp} transition={{ ...spring } as Transition}>
                            <MasterChallengeClient
                                key={`master-${level}-${setNo}`}
                                words={words}
                                onSuccess={handleMasterSuccess}
                                onExit={() => setTab('study')}
                            />
                        </motion.div>
                    ) : null}
                </AnimatePresence>}
            </div>
        </div>
    )
}
