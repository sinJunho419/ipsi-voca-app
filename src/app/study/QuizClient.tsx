'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Word } from '@/types/vocabulary'
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
        return { word, options: shuffle([correct, ...wrongs]), correct }
    })
}

interface Props { words: Word[] }

export default function QuizClient({ words }: Props) {
    const [quiz, setQuiz] = useState<QuizQuestion[]>([])
    const [index, setIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [selected, setSelected] = useState<string | null>(null)
    const [quizState, setQuizState] = useState<QuizState>('playing')
    const [animKey, setAnimKey] = useState(0)

    const initQuiz = useCallback(() => {
        setQuiz(buildQuiz(words))
        setIndex(0); setScore(0)
        setSelected(null); setQuizState('playing')
        setAnimKey(k => k + 1)
    }, [words])

    useEffect(() => { initQuiz() }, [initQuiz])

    useEffect(() => {
        const word = quiz[index]?.word.word
        if (!word) return
        const timer = setTimeout(() => speak(word), 700)
        return () => clearTimeout(timer)
    }, [index, quiz])

    const current = quiz[index]
    if (!current) return null

    function handleSelect(option: string) {
        if (selected !== null) return
        setSelected(option)

        if (option === current.correct) {
            const next = score + 1
            setScore(next)
            setTimeout(() => {
                if (index + 1 >= quiz.length) { setScore(next); setQuizState('finished') }
                else { setIndex(i => i + 1); setSelected(null); setQuizState('playing'); setAnimKey(k => k + 1) }
            }, 650)
        } else {
            setQuizState('wrong')
        }
    }

    function handleNext() {
        if (index + 1 >= quiz.length) setQuizState('finished')
        else { setIndex(i => i + 1); setSelected(null); setQuizState('playing'); setAnimKey(k => k + 1) }
    }

    /* 결과 화면 */
    if (quizState === 'finished') {
        const pct = Math.round((score / quiz.length) * 100)
        const emoji = pct === 100 ? '🏆' : pct >= 70 ? '👍' : '💪'
        return (
            <div className={`${styles.glass} ${styles.quizResult} ${styles.animPopIn}`}>
                <div className={styles.resultEmoji}>{emoji}</div>
                <h2 className={styles.resultTitle}>테스트 완료!</h2>
                <p className={styles.resultScore}>
                    <span className={styles.resultCorrect}>{score}</span>
                    <span className={styles.resultTotal}> / {quiz.length}</span>
                </p>
                <p className={styles.resultPct}>{pct}% 정답</p>
                <button
                    className={styles.retryBtn}
                    onClick={initQuiz}
                >🔄 다시 풀기</button>
            </div>
        )
    }

    const progress = (index / quiz.length) * 100

    return (
        <div className={styles.quiz}>
            {/* 진행 바 */}
            <div className={`${styles.glass} ${styles.progressRow}`}>
                <div className={styles.progressBar}>
                    <div
                        className={styles.progressFill}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className={styles.progressText}>{index + 1} / {quiz.length}</span>
            </div>

            {/* 문제 카드 */}
            <div
                key={animKey}
                className={`${styles.glass} ${styles.quizQuestion} ${styles.animSlideIn}`}
            >
                <p className={styles.quizWord}>{current.word.word}</p>
            </div>

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
                        <button
                            key={i}
                            className={`${cls} ${styles.animFadeUp}`}
                            style={{ animationDelay: `${i * 0.06}s` }}
                            onClick={() => handleSelect(opt)}
                            disabled={selected !== null}
                        >
                            {opt}
                        </button>
                    )
                })}
            </div>

            {/* 오답 피드백 */}
            {quizState === 'wrong' && (
                <div className={`${styles.glass} ${styles.wrongFeedback} ${styles.animFadeUp}`}>
                    <p>정답: <strong>{current.correct}</strong></p>
                    <button
                        className={styles.nextBtn}
                        onClick={handleNext}
                    >다음 →</button>
                </div>
            )}
        </div>
    )
}
