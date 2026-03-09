'use client'

import { useState, useCallback, useTransition, useEffect, useRef } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Word, Level } from '@/types/vocabulary'
import styles from './study.module.css'
import { useRouter } from 'next/navigation'
import QuizClient from './QuizClient'

const LEVELS: { value: Level; label: string }[] = [
    { value: 'elem_3', label: '초등 3학년' },
    { value: 'elem_4', label: '초등 4학년' },
    { value: 'elem_5', label: '초등 5학년' },
    { value: 'elem_6', label: '초등 6학년' },
    { value: 'high_1', label: '고등 1학년' },
]

type Tab = 'study' | 'quiz'

interface Props { initialWords: Word[]; initialMaxSet: number }

function speak(word: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(word)
    utter.lang = 'en-US'
    utter.rate = 0.85
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
    const [level, setLevel] = useState<Level>('elem_3')
    const [setNo, setSetNo] = useState<number>(1)
    const [availableSets, setAvailableSets] = useState<number[]>(
        Array.from({ length: initialMaxSet }, (_, i) => i + 1)
    )
    const [words, setWords] = useState<Word[]>(initialWords)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [isPending, startTransition] = useTransition()

    useEffect(() => { window.speechSynthesis.onvoiceschanged = () => { } }, [])

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

    async function changeLevel(newLevel: Level) {
        setLevel(newLevel)
        startTransition(async () => {
            // 해당 레벨의 모든 세트 번호를 가져옵니다.
            const { data: rangeData } = await supabase
                .from('words')
                .select('set_no')
                .eq('level', newLevel)
                .order('set_no', { ascending: true })

            if (!rangeData || rangeData.length === 0) {
                setAvailableSets([1])
                setSetNo(1)
                setWords([])
                return
            }

            const uniqueSets = Array.from(new Set(rangeData.map(d => d.set_no)))
            const minSetNo = uniqueSets[0]

            // 해당 레벨의 첫 번째 유효 세트 데이터를 가져옵니다.
            const { data: wordsResult } = await supabase
                .from('words')
                .select('*')
                .eq('level', newLevel)
                .eq('set_no', minSetNo)
                .order('id')

            setAvailableSets(uniqueSets)
            setSetNo(minSetNo)
            setWords((wordsResult ?? []) as Word[])
            prevIndexRef.current = -1
            setCurrentIndex(0)
            setIsFlipped(false)
        })
    }

    const changeSet = useCallback(async (newSetNo: number) => {
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
            <header className={styles.header}>
                <h1 className={styles.title}>📚 입시내비 보카</h1>
                <p className={styles.subtitle}>초등부터 고등까지 영단어 마스터</p>
            </header>
            {/* 벤토 그리드 */}
            <div className={styles.bento}>

                {/* 컨트롤 박스 */}
                <motion.div
                    className={`${styles.glass} ${styles.controls}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.08 } as Transition}
                >
                    <select value={level} onChange={e => changeLevel(e.target.value as Level)} disabled={isPending}>
                        {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                    <select value={setNo} onChange={e => changeSet(Number(e.target.value))} disabled={isPending}>
                        {availableSets.map(n => (
                            <option key={n} value={n}>Set {n}</option>
                        ))}
                    </select>

                    {/* 배틀 진입 버튼 */}
                    <button
                        className={styles.battleBtn}
                        onClick={() => router.push(`/battle/lobby?level=${level}&setNo=${setNo}`)}
                    >
                        🏆 배틀 참여하기
                    </button>
                </motion.div>

                {/* 탭 박스 */}
                <motion.div
                    className={`${styles.glass} ${styles.tabs}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.14 } as Transition}
                >
                    {(['study', 'quiz'] as Tab[]).map(t => (
                        <motion.button
                            key={t}
                            className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`}
                            onClick={() => setTab(t)}
                            disabled={t === 'quiz' && words.length === 0}
                            whileTap={{ scale: 0.93 }}
                            transition={spring}
                        >
                            {t === 'study' ? '📖 학습하기' : '✏️ 테스트하기'}
                        </motion.button>
                    ))}
                </motion.div>

                {/* 탭 콘텐츠 */}
                <AnimatePresence mode="wait">
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
                    ) : (
                        /* ── 퀴즈 탭 ── */
                        words.length < 4 ? (
                            <motion.div key="quiz-empty" {...fadeUp} className={`${styles.glass} ${styles.empty}`}>
                                퀴즈는 단어가 최소 4개 이상 필요합니다.
                            </motion.div>
                        ) : (
                            <motion.div key="quiz-content" {...fadeUp} transition={{ ...spring } as Transition}>
                                <QuizClient key={`${level}-${setNo}`} words={words} />
                            </motion.div>
                        )
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
