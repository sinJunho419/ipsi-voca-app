'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Word } from '@/types/vocabulary'
import QuizTimerBar from './QuizTimerBar'
import styles from './study.module.css'

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

type QuizState = 'playing' | 'wrong' | 'finished'

interface QuizQuestion {
    word: Word
    options: string[]
    correct: string
    isIdiom: boolean
}

function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5)
}

function buildQuiz(words: Word[]): QuizQuestion[] {
    const allMeanings = words.map(w => w.mean_1)
    return shuffle(words).map(word => {
        const correct = word.mean_1
        const wrongs = shuffle(allMeanings.filter(m => m !== correct)).slice(0, 3)
        while (wrongs.length < 3) wrongs.push('(없음)')
        const isIdiom = word.type === 'idiom'
        return { word, options: shuffle([correct, ...wrongs]), correct, isIdiom }
    })
}

/** 문제 타입 + 레벨에 따른 타이머(초) 산정 */
function getTimerSec(word: Word): number {
    if (word.type === 'idiom') {
        const lv = word.level || ''
        return lv.startsWith('high') ? 10 : 8
    }
    return 4
}

const spring: Transition = { type: 'spring', stiffness: 420, damping: 30 }

interface Props { words: Word[]; onExit?: () => void; onFinish?: (score: number, total: number) => void }

export default function QuizClient({ words, onExit, onFinish }: Props) {
    const supabase = createClient()
    const [quiz, setQuiz] = useState<QuizQuestion[]>([])
    const [index, setIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [selected, setSelected] = useState<string | null>(null)
    const [quizState, setQuizState] = useState<QuizState>('playing')

    // 타이머 리셋 트리거 (문제 변경 시 증가)
    const [timerReset, setTimerReset] = useState(0)

    // 오답 단어 추적
    const wrongWordIdsRef = useRef<number[]>([])
    const wrongSavedRef = useRef(false)

    const initQuiz = useCallback(() => {
        setQuiz(buildQuiz(words))
        setIndex(0); setScore(0)
        setSelected(null); setQuizState('playing')
        setTimerReset(t => t + 1)
        wrongWordIdsRef.current = []
        wrongSavedRef.current = false
        finishCalledRef.current = false
    }, [words])

    useEffect(() => { initQuiz() }, [initQuiz])

    // 새 문제가 나올 때 자동 발음 — 카드 등장 애니메이션 후 재생
    useEffect(() => {
        const word = quiz[index]?.word.word
        if (!word) return
        const timer = setTimeout(() => speak(word), 700)
        return () => clearTimeout(timer)
    }, [index, quiz])

    // 오답/타임아웃 시 1.5초 후 자동으로 다음 문제
    useEffect(() => {
        if (quizState !== 'wrong') return
        const timer = setTimeout(() => {
            if (index + 1 >= quiz.length) setQuizState('finished')
            else { setIndex(i => i + 1); setSelected(null); setQuizState('playing'); setTimerReset(t => t + 1) }
        }, 1500)
        return () => clearTimeout(timer)
    }, [quizState, index, quiz.length])

    // 퀴즈 종료 시 결과 콜백 + 오답 단어 저장
    const finishCalledRef = useRef(false)
    useEffect(() => {
        if (quizState !== 'finished') return
        if (!finishCalledRef.current) {
            finishCalledRef.current = true
            onFinish?.(score, quiz.length)
        }
        if (wrongSavedRef.current || wrongWordIdsRef.current.length === 0) return
        wrongSavedRef.current = true

        async function saveWrongWords() {
            const ids = wrongWordIdsRef.current
            // localStorage에 오답 저장 (비로그인용)
            try {
                const stored: Record<number, { wrong_count: number; consecutive_correct: number; status: string; last_wrong_at: string }> = JSON.parse(localStorage.getItem('local_wrong_words') || '{}')
                for (const wid of ids) {
                    const existing = stored[wid] || { wrong_count: 0, consecutive_correct: 0, status: 'Learning', last_wrong_at: '' }
                    existing.wrong_count += 1
                    existing.consecutive_correct = 0
                    existing.status = 'Learning'
                    existing.last_wrong_at = new Date().toISOString()
                    stored[wid] = existing
                }
                localStorage.setItem('local_wrong_words', JSON.stringify(stored))
            } catch { /* ignore */ }

            // 로그인 시 Supabase에도 저장
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            await supabase.rpc('record_wrong_words', {
                p_user_id: user.id,
                p_word_ids: ids,
            })
        }
        saveWrongWords()
    }, [quizState, supabase])

    const current = quiz[index]
    if (!current) return null

    const timerDuration = getTimerSec(current.word)

    // 타임아웃 → 오답 처리 + 자동 넘기기
    function handleTimeout() {
        if (selected !== null || quizState !== 'playing') return
        wrongWordIdsRef.current.push(current.word.id)
        setSelected('__timeout__')
        setQuizState('wrong')
    }

    function handleSelect(option: string) {
        if (selected !== null) return
        setSelected(option)

        if (option === current.correct) {
            const next = score + 1
            setScore(next)
            setTimeout(() => {
                if (index + 1 >= quiz.length) { setScore(next); setQuizState('finished') }
                else { setIndex(i => i + 1); setSelected(null); setQuizState('playing'); setTimerReset(t => t + 1) }
            }, 650)
        } else {
            wrongWordIdsRef.current.push(current.word.id)
            setQuizState('wrong')
        }
    }

    /* 결과 화면 */
    if (quizState === 'finished') {
        const pct = Math.round((score / quiz.length) * 100)
        const isSuccess = pct >= 90
        const emoji = pct === 100 ? '🏆' : pct >= 90 ? '🎉' : pct >= 70 ? '👍' : '💪'
        return (
            <motion.div
                className={`${styles.glass} ${styles.quizResult}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
            >
                <div className={styles.resultEmoji}>{emoji}</div>
                <h2 className={styles.resultTitle}>테스트 완료!</h2>
                <p className={styles.resultScore}>
                    <span className={styles.resultCorrect}>{score}</span>
                    <span className={styles.resultTotal}> / {quiz.length}</span>
                </p>
                <p className={styles.resultPct}>{pct}% 정답</p>
                <p className={isSuccess ? styles.resultSuccess : styles.resultFail}>
                    {isSuccess ? '성공! (90% 이상)' : '90% 이상이면 성공입니다'}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <motion.button
                        className={styles.retryBtn}
                        onClick={initQuiz}
                        whileTap={{ scale: 0.93 }}
                        transition={spring}
                    >다시 풀기</motion.button>
                    {onExit && (
                        <motion.button
                            className={styles.retryBtn}
                            onClick={onExit}
                            whileTap={{ scale: 0.93 }}
                            transition={spring}
                            style={{ background: 'linear-gradient(135deg, #475569, #64748b)' }}
                        >나가기</motion.button>
                    )}
                </div>
            </motion.div>
        )
    }

    const progress = (index / quiz.length) * 100

    return (
        <div className={styles.quiz}>
            {/* 진행 바 */}
            <div className={`${styles.glass} ${styles.progressRow}`}>
                <div className={styles.progressBar}>
                    <motion.div
                        className={styles.progressFill}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4 }}
                    />
                </div>
                <span className={styles.progressText}>{index + 1} / {quiz.length}</span>
            </div>

            {/* 타입 배지 + 동적 타이머 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <motion.span
                    key={current.isIdiom ? 'idiom' : 'word'}
                    className={`${styles.typeBadge} ${current.isIdiom ? styles.typeBadgeIdiom : styles.typeBadgeWord}`}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                    {current.isIdiom ? '🔗 숙어' : '📝 단어'} · {timerDuration}초
                </motion.span>
            </div>
            <QuizTimerBar
                onTimeout={handleTimeout}
                resetTrigger={timerReset}
                stopped={selected !== null}
                totalTimeSec={timerDuration}
            />

            {/* 문제 카드 */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    className={`${styles.glass} ${styles.quizQuestion}`}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={spring}
                >
                    <p className={`${styles.quizWord} ${current.isIdiom ? styles.quizWordIdiom : ''}`}>
                        {current.word.word}
                    </p>
                </motion.div>
            </AnimatePresence>

            {/* 선택지 */}
            <div className={styles.quizOptions}>
                {current.options.map((opt, i) => {
                    let cls = styles.quizOption
                    if (selected !== null) {
                        if (opt === current.correct) cls = `${styles.quizOption} ${styles.optCorrect}`
                        else if (opt === selected) cls = `${styles.quizOption} ${styles.optWrong}`
                        else cls = `${styles.quizOption} ${styles.optDim}`
                    }
                    return (
                        <motion.button
                            key={`${index}-${i}`}
                            className={cls}
                            onClick={() => handleSelect(opt)}
                            disabled={selected !== null}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...spring, delay: i * 0.06 }}
                            whileTap={selected === null ? { scale: 0.94 } : {}}
                        >
                            {opt}
                        </motion.button>
                    )
                })}
            </div>

            {/* 오답 피드백 (1.5초 후 자동 넘김) */}
            <AnimatePresence>
                {quizState === 'wrong' && (
                    <motion.div
                        className={`${styles.glass} ${styles.wrongFeedback}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={spring}
                    >
                        <p>
                            {selected === '__timeout__' ? '⏰ 시간 초과! ' : ''}
                            정답: <strong>{current.correct}</strong>
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
