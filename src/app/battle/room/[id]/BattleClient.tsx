'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Word } from '@/types/vocabulary'
import styles from '../room.module.css'

interface RoomData {
    id: string
    room_code: string
    host_id: string
    guest_id: string | null
    status: 'waiting' | 'playing' | 'finished'
    level: string
    set_no: number
}

interface Props {
    room: RoomData
    myId: string
}

type QuizState = 'playing' | 'wrong' | 'finished'

interface QuizQuestion {
    word: Word
    options: string[]
    correct: string
}

// 두 유저에게 정확히 동일한 문제 순서와 선택지를 제공하기 위한 결정적(Deterministic) 퀴즈 생성
function buildDeterministicQuiz(words: Word[]): QuizQuestion[] {
    // ID 순서대로 정렬 (문제 순서 일치)
    const sortedWords = [...words].sort((a, b) => a.id - b.id)
    const allMeanings = sortedWords.map(w => w.mean_1)

    return sortedWords.map((word, i) => {
        const correct = word.mean_1
        const w1 = allMeanings[(i + 1) % allMeanings.length]
        const w2 = allMeanings[(i + 2) % allMeanings.length]
        const w3 = allMeanings[(i + 3) % allMeanings.length]

        let wrongs = Array.from(new Set([w1, w2, w3])).filter(m => m !== correct)
        while (wrongs.length < 3) wrongs.push(`(오답 ${Math.random()})`)
        wrongs = wrongs.slice(0, 3)

        // 보기 순서도 결정적으로 (알파벳 정렬 등 하면 너무 뻔해지므로 간단한 해시처럼 길이로 정렬)
        const options = [correct, ...wrongs].sort((a, b) => {
            const sumA = a.length + (a.charCodeAt(0) || 0)
            const sumB = b.length + (b.charCodeAt(0) || 0)
            return (sumA % 5) - (sumB % 5) // 대략적인 pseudo-random 섞기
        })

        return { word, options, correct }
    })
}

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

const spring: Transition = { type: 'spring', stiffness: 420, damping: 30 }

export default function BattleClient({ room, myId }: Props) {
    const supabase = createClient()
    const [words, setWords] = useState<Word[]>([])
    const [quiz, setQuiz] = useState<QuizQuestion[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [index, setIndex] = useState(0)
    const [myScore, setMyScore] = useState(0)
    const [opponentScore, setOpponentScore] = useState(0)
    const [selected, setSelected] = useState<string | null>(null)
    const [quizState, setQuizState] = useState<QuizState>('playing')

    // 1. 단어 데이터 페칭 및 퀴즈 빌드
    useEffect(() => {
        async function fetchWords() {
            const { data } = await supabase
                .from('words')
                .select('*')
                .eq('level', room.level)
                .eq('set_no', room.set_no)

            if (data && data.length > 0) {
                setWords(data as Word[])
                setQuiz(buildDeterministicQuiz(data as Word[]))
            }
            setIsLoading(false)
        }
        fetchWords()
    }, [room, supabase])

    // 2. Supabase Broadcast 설정 (실시간 점수 동기화)
    useEffect(() => {
        const channel = supabase.channel(`battle:${room.id}`)

        channel
            .on('broadcast', { event: 'score_update' }, (payload) => {
                if (payload.payload.userId !== myId) {
                    setOpponentScore(payload.payload.score)
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [room.id, myId, supabase])

    // 자동 발음
    useEffect(() => {
        const word = quiz[index]?.word.word
        if (!word) return
        const timer = setTimeout(() => speak(word), 700)
        return () => clearTimeout(timer)
    }, [index, quiz])

    const broadcastScore = useCallback(async (newScore: number) => {
        await supabase.channel(`battle:${room.id}`).send({
            type: 'broadcast',
            event: 'score_update',
            payload: { userId: myId, score: newScore }
        })
    }, [room.id, myId, supabase])

    if (isLoading) return <div className={styles.loader}>퀴즈 불러오는 중...</div>
    if (quiz.length === 0) return <div className={styles.errorText}>단어 데이터가 없습니다.</div>

    const current = quiz[index]
    const isHost = room.host_id === myId
    const opponentName = isHost ? "참가자" : "방장"

    function handleSelect(option: string) {
        if (selected !== null) return
        setSelected(option)

        if (option === current.correct) {
            const nextScore = myScore + 1
            setMyScore(nextScore)
            broadcastScore(nextScore) // 상대방에게 점수 전송

            setTimeout(() => {
                if (index + 1 >= quiz.length) { setQuizState('finished') }
                else { setIndex(i => i + 1); setSelected(null); setQuizState('playing') }
            }, 650)
        } else {
            setQuizState('wrong')
            // 틀림 (상대방도 내가 틀린 걸 알 필요가 있다면 broadcast 가능하지만, 현재는 내 점수만)
        }
    }

    function handleNext() {
        if (index + 1 >= quiz.length) setQuizState('finished')
        else { setIndex(i => i + 1); setSelected(null); setQuizState('playing') }
    }

    // 결과 화면
    if (quizState === 'finished') {
        const isWin = myScore > opponentScore
        const isTie = myScore === opponentScore
        return (
            <motion.div className={styles.card} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className={styles.title}>
                    {isTie ? '무승부! 🤝' : (isWin ? '승리! 🏆' : '패배... 🥲')}
                </h2>
                <div className={styles.playerContainer}>
                    <div className={styles.playerCard}>
                        <p className={styles.label}>나의 점수</p>
                        <h1 className={styles.roomCode}>{myScore}</h1>
                    </div>
                    <div className={styles.vs}>VS</div>
                    <div className={styles.playerCard}>
                        <p className={styles.label}>상대방 점수</p>
                        <h1 className={styles.roomCode}>{opponentScore}</h1>
                    </div>
                </div>
            </motion.div>
        )
    }

    const myProgress = (myScore / quiz.length) * 100
    const opponentProgress = (opponentScore / quiz.length) * 100

    return (
        <div className={styles.battleWrap}>
            {/* 상단 스코어보드 바 */}
            <div className={styles.scoreboard}>
                <div className={styles.scoreRow}>
                    <span className={styles.scoreName}>나</span>
                    <div className={styles.progressBar}>
                        <motion.div className={styles.progressFill} animate={{ width: `${myProgress}%` }} />
                    </div>
                    <span className={styles.scoreVal}>{myScore}</span>
                </div>
                <div className={styles.scoreRow}>
                    <span className={styles.scoreName}>{opponentName}</span>
                    <div className={styles.progressBar}>
                        <motion.div className={styles.progressFillOpponent} animate={{ width: `${opponentProgress}%` }} />
                    </div>
                    <span className={styles.scoreVal}>{opponentScore}</span>
                </div>
            </div>

            {/* 카드 퀴즈 영역 (QuizClient와 유사) */}
            <div className={styles.card}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={spring}
                        className={styles.questionArea}
                    >
                        <h2 className={styles.questionWord}>{current.word.word}</h2>
                    </motion.div>
                </AnimatePresence>

                <div className={styles.optionsGrid}>
                    {current.options.map((opt, i) => {
                        let cls = styles.quizOption
                        if (selected !== null) {
                            if (opt === current.correct) cls = `${styles.quizOption} ${styles.optCorrect}`
                            else if (opt === selected) cls = `${styles.quizOption} ${styles.optWrong}`
                            else cls = `${styles.quizOption} ${styles.optDim}`
                        }
                        return (
                            <motion.button
                                key={i}
                                className={cls}
                                onClick={() => handleSelect(opt)}
                                disabled={selected !== null}
                                whileTap={selected === null ? { scale: 0.95 } : {}}
                            >
                                {opt}
                            </motion.button>
                        )
                    })}
                </div>

                <AnimatePresence>
                    {quizState === 'wrong' && (
                        <motion.div
                            className={styles.wrongFeedback}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <p>정답: <strong>{current.correct}</strong></p>
                            <button className={styles.btnSecondary} onClick={handleNext}>다음 →</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
