'use client'

import { useState, useCallback, useTransition, useEffect, useRef } from 'react'
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
    { value: 'high_2', label: '고등 2학년' },
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
    const [cardKey, setCardKey] = useState(0)

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
            setCardKey(k => k + 1)
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
            setCardKey(k => k + 1)
        })
    }, [level]) // eslint-disable-line react-hooks/exhaustive-deps

    const current = words[currentIndex]
    const meanings = [current?.mean_1, current?.mean_2, current?.mean_3].filter(Boolean)
    const progress = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0

    return (
        <div className={styles.page}>
            <div className={styles.bento}>

                {/* 컨트롤 박스 */}
                <div className={`${styles.glass} ${styles.controls} ${styles.animFadeUp}`} style={{ animationDelay: '0.08s' }}>
                    <select value={level} onChange={e => changeLevel(e.target.value as Level)} disabled={isPending}>
                        {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                    <select value={setNo} onChange={e => changeSet(Number(e.target.value))} disabled={isPending}>
                        {availableSets.map(n => (
                            <option key={n} value={n}>Set {n}</option>
                        ))}
                    </select>
                    <button
                        className={styles.battleBtn}
                        onClick={() => router.push(`/battle/lobby?level=${level}&setNo=${setNo}`)}
                    >
                        🏆 배틀 참여하기
                    </button>
                </div>

                {/* 탭 박스 */}
                <div className={`${styles.glass} ${styles.tabs} ${styles.animFadeUp}`} style={{ animationDelay: '0.14s' }}>
                    {(['study', 'quiz'] as Tab[]).map(t => (
                        <button
                            key={t}
                            className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`}
                            onClick={() => setTab(t)}
                            disabled={t === 'quiz' && words.length === 0}
                        >
                            {t === 'study' ? '📖 학습하기' : '✏️ 테스트하기'}
                        </button>
                    ))}
                </div>

                {/* 탭 콘텐츠 */}
                {tab === 'study' ? (
                    isPending ? (
                        <div className={`${styles.glass} ${styles.empty} ${styles.animFadeUp}`}>
                            로딩 중…
                        </div>
                    ) : words.length === 0 ? (
                        <div className={styles.animFadeUp} style={{ animationDelay: '0.05s' }}>
                            {/* 빈 플래시카드 */}
                            <div className={`${styles.cardWrap} ${styles.animPopIn}`} style={{ margin: '0.5rem 0' }}>
                                <div className={styles.card}>
                                    <div className={`${styles.cardFace} ${styles.cardFront}`}>
                                        <span className={styles.wordText} style={{ opacity: 0.25 }}>?</span>
                                    </div>
                                </div>
                            </div>
                            {/* 이전 / 다음 (비활성) */}
                            <div className={`${styles.glass} ${styles.nav}`}>
                                <button className={styles.navBtn} disabled>← 이전</button>
                                <button className={styles.navBtn} disabled>다음 →</button>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.animFadeUp} style={{ animationDelay: '0.05s' }}>
                            {/* 진행 바 */}
                            <div className={`${styles.glass} ${styles.progressRow}`}>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className={styles.progressText}>{currentIndex + 1} / {words.length}</span>
                            </div>

                            {/* 플래시카드 */}
                            <div
                                key={`${cardKey}-${currentIndex}`}
                                className={`${styles.cardWrap} ${styles.animPopIn}`}
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
                                        <button
                                            className={styles.speakBtn}
                                            onClick={e => { e.stopPropagation(); speak(current.word) }}
                                            title="발음 듣기"
                                        >🔊</button>
                                    </div>
                                    {/* 뒷면 */}
                                    <div className={`${styles.cardFace} ${styles.cardBack}`}>
                                        <div className={styles.meaningText}>
                                            {meanings.map((m, i) => <div key={i}>{m}</div>)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 힌트 */}
                            <p className={styles.hint}>
                                {isFlipped ? '🔄 다시 클릭하면 단어로 돌아갑니다' : '👆 카드를 클릭하면 뜻이 보입니다'}
                            </p>

                            {/* 이전 / 다음 */}
                            <div className={`${styles.glass} ${styles.nav}`}>
                                <button
                                    className={styles.navBtn}
                                    onClick={() => { setCurrentIndex(i => i - 1); setIsFlipped(false) }}
                                    disabled={currentIndex === 0}
                                >← 이전</button>
                                <button
                                    className={styles.navBtn}
                                    onClick={() => { setCurrentIndex(i => i + 1); setIsFlipped(false) }}
                                    disabled={currentIndex === words.length - 1}
                                >다음 →</button>
                            </div>
                        </div>
                    )
                ) : (
                    /* ── 퀴즈 탭 ── */
                    words.length < 4 ? (
                        <div className={`${styles.glass} ${styles.empty} ${styles.animFadeUp}`}>
                            퀴즈는 단어가 최소 4개 이상 필요합니다.
                        </div>
                    ) : (
                        <div className={styles.animFadeUp}>
                            <QuizClient key={`${level}-${setNo}`} words={words} />
                        </div>
                    )
                )}
            </div>
        </div>
    )
}
