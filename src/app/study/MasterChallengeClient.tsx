'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Word } from '@/types/vocabulary'
import QuizTimerBar from './QuizTimerBar'
import styles from './study.module.css'

function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5)
}

interface MasterQuestion {
    word: Word
    sentence: string
    answer: string
    options: string[]
}

function buildMasterQuiz(words: Word[]): MasterQuestion[] {
    const wordsWithSentence = words.filter(w => w.example_sentence?.trim())
    const source = wordsWithSentence.length >= 4 ? wordsWithSentence : words
    const allWords = words.map(w => w.word)

    return shuffle(source).map(word => {
        const answer = word.word
        let sentence: string

        if (word.example_sentence?.trim()) {
            const regex = new RegExp(word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
            sentence = word.example_sentence.replace(regex, '________')
        } else {
            sentence = `뜻: ${word.mean_1}`
        }

        const wrongs = shuffle(allWords.filter(w => w.toLowerCase() !== answer.toLowerCase())).slice(0, 3)
        while (wrongs.length < 3) wrongs.push('—')
        const options = shuffle([answer, ...wrongs])

        return { word, sentence, answer, options }
    })
}

const spring: Transition = { type: 'spring', stiffness: 420, damping: 30 }

type ChallengeState = 'playing' | 'wrong' | 'finished' | 'failed'

interface Props {
    words: Word[]
    level?: string
    setNo?: number
    setType?: string
    onSuccess: () => void
    onExit: () => void
}

export default function MasterChallengeClient({ words, level, setNo, setType, onSuccess, onExit }: Props) {
    const supabase = createClient()
    const [quiz, setQuiz] = useState<MasterQuestion[]>([])
    const [index, setIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [selected, setSelected] = useState<string | null>(null)
    const [state, setState] = useState<ChallengeState>('playing')
    const [timerReset, setTimerReset] = useState(0)

    const initQuiz = useCallback(() => {
        setQuiz(buildMasterQuiz(words))
        setIndex(0)
        setScore(0)
        setSelected(null)
        setState('playing')
        setTimerReset(t => t + 1)
    }, [words])

    useEffect(() => { initQuiz() }, [initQuiz])

    // 오답/타임아웃 → 1.5초 후 실패 확정
    useEffect(() => {
        if (state !== 'wrong') return
        const timer = setTimeout(() => setState('failed'), 1500)
        return () => clearTimeout(timer)
    }, [state])

    const current = quiz[index]
    if (!current) return null

    function handleTimeout() {
        if (selected !== null || state !== 'playing') return
        setSelected('__timeout__')
        setState('wrong')
    }

    function handleSelect(option: string) {
        if (selected !== null) return
        setSelected(option)

        if (option === current.answer) {
            const nextScore = score + 1
            setScore(nextScore)
            setTimeout(() => {
                if (index + 1 >= quiz.length) {
                    setState('finished')
                } else {
                    setIndex(i => i + 1)
                    setSelected(null)
                    setState('playing')
                    setTimerReset(t => t + 1)
                }
            }, 650)
        } else {
            setState('wrong')
        }
    }

    // 실패 화면
    if (state === 'failed') {
        return (
            <motion.div
                className={`${styles.glass} ${styles.quizResult}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
            >
                <div className={styles.resultEmoji}>😢</div>
                <h2 className={styles.resultTitle}>마스터 챌린지 실패</h2>
                <p className={styles.resultPct}>100% 정답이어야 성공합니다</p>
                <p className={styles.resultScore}>
                    <span className={styles.resultCorrect}>{score}</span>
                    <span className={styles.resultTotal}> / {quiz.length}</span>
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <motion.button className={styles.retryBtn} onClick={initQuiz} whileTap={{ scale: 0.93 }} transition={spring}>
                        🔄 다시 도전
                    </motion.button>
                    <motion.button
                        className={styles.retryBtn} onClick={onExit} whileTap={{ scale: 0.93 }} transition={spring}
                        style={{ background: 'linear-gradient(135deg, #64748b, #94a3b8)' }}
                    >
                        ✕ 나가기
                    </motion.button>
                </div>
            </motion.div>
        )
    }

    // 성공 화면
    if (state === 'finished') {
        return (
            <motion.div
                className={`${styles.glass} ${styles.quizResult}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
            >
                <div className={styles.resultEmoji}>🏅</div>
                <h2 className={styles.resultTitle}>마스터 챌린지 성공!</h2>
                <p className={styles.resultPct}>100% 정답! 메달 획득!</p>
                <motion.button
                    className={styles.masterCompleteBtn}
                    onClick={async () => {
                        // activity_log에 마스터 챌린지 성공 기록
                        if (level && setNo != null) {
                            const { data: { user } } = await supabase.auth.getUser()
                            if (user) {
                                const loginInfoId = user.user_metadata?.login_info_id
                                if (loginInfoId) {
                                    await supabase.from('activity_log').insert({
                                        user_id: loginInfoId,
                                        activity_type: 'master_complete',
                                        level,
                                        set_no: setNo,
                                        set_type: setType || 'word',
                                        score: quiz.length,
                                        total: quiz.length,
                                    })
                                }
                            }
                        }
                        onSuccess()
                    }}
                    whileTap={{ scale: 0.93 }}
                    transition={spring}
                >
                    🏅 메달 받기
                </motion.button>
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
                        style={{ background: 'linear-gradient(90deg, #f59e0b, #eab308)' }}
                    />
                </div>
                <span className={styles.progressText}>{index + 1} / {quiz.length}</span>
            </div>

            {/* 8초 타이머 */}
            <QuizTimerBar
                onTimeout={handleTimeout}
                resetTrigger={timerReset}
                stopped={selected !== null}
                totalTimeSec={8}
                accentColor="#f59e0b"
            />

            {/* 예문 카드 */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    className={`${styles.glass} ${styles.quizQuestion} ${styles.masterQuestion}`}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={spring}
                >
                    <p className={styles.masterSentence}>{current.sentence}</p>
                </motion.div>
            </AnimatePresence>

            {/* 선택지 */}
            <div className={styles.quizOptions}>
                {current.options.map((opt, i) => {
                    let cls = styles.quizOption
                    if (selected !== null) {
                        if (opt === current.answer) cls = `${styles.quizOption} ${styles.optCorrect}`
                        else if (opt === selected && opt !== '__timeout__') cls = `${styles.quizOption} ${styles.optWrong}`
                        else cls = `${styles.quizOption} ${styles.optDim}`
                    }
                    return (
                        <motion.button
                            key={i}
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

            {/* 정오답 피드백 */}
            <AnimatePresence>
                {state === 'wrong' && (
                    <motion.div
                        className={`${styles.glass} ${styles.wrongFeedback}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={spring}
                    >
                        <p>
                            {selected === '__timeout__' ? '⏰ 시간 초과! ' : ''}
                            정답: <strong>{current.answer}</strong> — 챌린지 실패!
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
