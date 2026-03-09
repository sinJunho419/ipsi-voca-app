'use client'

import { useState, useCallback, useTransition, useEffect, useRef } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Word, Level } from '@/types/vocabulary'
import styles from './study.module.css'
import { useRouter } from 'next/navigation'
import QuizClient from './QuizClient'
import MasterChallengeClient from './MasterChallengeClient'
import WrongWordsClient from './WrongWordsClient'
import BattleFeed from '@/components/BattleFeed'

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

    const [tab, setTab] = useState<Tab>('study')
    const [level, setLevel] = useState<Level | null>(null)
    const [setNo, setSetNo] = useState<number | null>(null)
    const [availableSets, setAvailableSets] = useState<number[]>([])
    const [words, setWords] = useState<Word[]>([])
    const isReady = level !== null && setNo !== null

    // 성공 횟수 & 메달 (level+set 별 localStorage 저장)
    const [successCount, setSuccessCount] = useState(0)
    const [medalCount, setMedalCount] = useState(0)

    const progressKey = level && setNo !== null ? `progress_${level}_${setNo}` : null

    // level+set 변경 시 저장된 성공/메달 불러오기
    useEffect(() => {
        if (!progressKey) return
        try {
            const saved = JSON.parse(localStorage.getItem(progressKey) || '{}')
            setSuccessCount(saved.success ?? 0)
            setMedalCount(saved.medal ?? 0)
        } catch { setSuccessCount(0); setMedalCount(0) }
    }, [progressKey])

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
                .select('set_no')
                .eq('level', newLevel)
                .order('set_no', { ascending: true })

            if (!rangeData || rangeData.length === 0) {
                setAvailableSets([])
                return
            }

            const uniqueSets = Array.from(new Set(rangeData.map(d => d.set_no)))
            setAvailableSets(uniqueSets)
        })
    }

    const changeSet = useCallback(async (val: string) => {
        if (!val || !level) return
        const newSetNo = Number(val)
        setSetNo(newSetNo)
        startTransition(async () => {
            const { data } = await supabase
                .from('words').select('*').eq('level', level).eq('set_no', newSetNo).order('id')
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
                            <option value="" disabled>학년을 선택하세요</option>
                            {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                        <select value={setNo ?? ''} onChange={e => changeSet(e.target.value)} disabled={isPending || !level}>
                            <option value="" disabled>세트를 선택하세요</option>
                            {availableSets.map(n => (
                                <option key={n} value={n}>Set {n}</option>
                            ))}
                        </select>
                    </div>

                    {/* 2줄: 주요 액션 버튼 */}
                    <div className={styles.actionRow}>
                        <button
                            className={styles.battleBtn}
                            onClick={() => router.push(`/battle/lobby${level ? `?level=${level}&setNo=${setNo}` : ''}`)}
                        >
                            🏆 배틀 참여하기
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
                            {!level ? '학년과 세트를 선택하세요' : '세트를 선택하세요'}
                        </p>
                    )}
                </motion.div>

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
                                            <span className={styles.wordText}>{current.word}</span>
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
