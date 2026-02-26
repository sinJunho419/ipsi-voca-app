'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Word } from '@/types/vocabulary'
import styles from '../room.module.css'
import confetti from 'canvas-confetti'

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

type QuizState = 'playing' | 'wrong' | 'finished' | 'countdown'

interface QuizQuestion {
    word: Word
    options: string[]
    correct: string
}

function buildDeterministicQuiz(words: Word[]): QuizQuestion[] {
    const sortedWords = [...words].sort((a, b) => a.id - b.id)
    const allMeanings = sortedWords.map(w => w.mean_1)

    return sortedWords.map((word, i) => {
        const correct = word.mean_1
        const w1 = allMeanings[(i + 1) % allMeanings.length]
        const w2 = allMeanings[(i + 2) % allMeanings.length]
        const w3 = allMeanings[(i + 3) % allMeanings.length]
        
        let wrongs = Array.from(new Set([w1, w2, w3])).filter(m => m !== correct)
        while(wrongs.length < 3) wrongs.push(`(오답 ${Math.random().toString().slice(2, 5)})`)
        wrongs = wrongs.slice(0, 3)

        const options = [correct, ...wrongs].sort((a, b) => {
            const sumA = a.length + (a.charCodeAt(0) || 0)
            const sumB = b.length + (b.charCodeAt(0) || 0)
            return (sumA % 5) - (sumB % 5)
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
    const [quizState, setQuizState] = useState<QuizState>('countdown')
    const [countdownNum, setCountdownNum] = useState<number | string>(3)

    const isHost = room.host_id === myId
    const opponentId = isHost ? room.guest_id : room.host_id

    // 1. 데이터 로드
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

    // 2. 카운트다운 로직
    useEffect(() => {
        if (isLoading) return
        
        let timer: NodeJS.Timeout
        if (typeof countdownNum === 'number') {
            timer = setTimeout(() => {
                if (countdownNum > 1) {
                    setCountdownNum(countdownNum - 1)
                } else {
                    setCountdownNum('GO!')
                }
            }, 1000)
        } else if (countdownNum === 'GO!') {
            timer = setTimeout(() => {
                setQuizState('playing')
                setCountdownNum('')
            }, 800)
        }
        
        return () => clearTimeout(timer)
    }, [countdownNum, isLoading])

    // 3. Broadcast 구독
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
        if (quizState !== 'playing') return
        const word = quiz[index]?.word.word
        if (!word) return
        const timer = setTimeout(() => speak(word), 500)
        return () => clearTimeout(timer)
    }, [index, quiz, quizState])

    const broadcastScore = useCallback(async (newScore: number) => {
        await supabase.channel(`battle:${room.id}`).send({
            type: 'broadcast',
            event: 'score_update',
            payload: { userId: myId, score: newScore }
        })
    }, [room.id, myId, supabase])

    // 결과 효과
    useEffect(() => {
        if (quizState === 'finished') {
            if (myScore > opponentScore) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#6366f1', '#a5b4fc', '#f9a8d4']
                })
            }
        }
    }, [quizState, myScore, opponentScore])

    if (isLoading) return <div className={styles.loader}>영단어 전쟁 준비 중...</div>
    if (quiz.length === 0) return <div className={styles.errorText}>데이터가 없습니다.</div>

    const current = quiz[index]
    const total = quiz.length

    // 중앙 지향 계산
    // Host(Blue)는 왼쪽에서 50%까지, Guest(Green)는 오른쪽에서 50%까지
    const hostScore = isHost ? myScore : opponentScore
    const guestScore = isHost ? opponentScore : myScore
    
    const hostPos = (hostScore / total) * 45 // 45% 정도만 이동 (중앙선 부근까지)
    const guestPos = (guestScore / total) * 45

    function handleSelect(option: string) {
        if (selected !== null || quizState !== 'playing') return
        setSelected(option)

        if (option === current.correct) {
            const nextScore = myScore + 1
            setMyScore(nextScore)
            broadcastScore(nextScore)

            setTimeout(() => {
                if (index + 1 >= total) { setQuizState('finished') }
                else { setIndex(i => i + 1); setSelected(null) }
            }, 600)
        } else {
            setQuizState('wrong')
        }
    }

    function handleNext() {
        if (index + 1 >= total) setQuizState('finished')
        else { setIndex(i => i + 1); setSelected(null); setQuizState('playing') }
    }

    if (quizState === 'finished') {
        const isWin = myScore > opponentScore
        const isTie = myScore === opponentScore
        return (
            <motion.div 
                className={`${styles.card} ${styles.winnerCard}`} 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
            >
                <div className={styles.resultEmoji}>{isTie ? '🤝' : (isWin ? '🏆' : '🥲')}</div>
                <h2 className={styles.title}>
                    {isTie ? '무승부!' : (isWin ? '승리!' : '패배...')}
                </h2>
                <div className={styles.playerContainer}>
                    <div className={styles.playerCard}>
                        <p className={styles.label}>나</p>
                        <h1 className={styles.roomCode}>{myScore}</h1>
                    </div>
                    <div className={styles.vs}>VS</div>
                    <div className={styles.playerCard}>
                        <p className={styles.label}>상대방</p>
                        <h1 className={styles.roomCode}>{opponentScore}</h1>
                    </div>
                </div>
                <button className={styles.btnPrimary} style={{ marginTop: '2rem' }} onClick={() => window.location.href = '/study'}>
                    돌아가기
                </button>
            </motion.div>
        )
    }

    return (
        <div className={styles.battleWrap}>
            {/* 카운트다운 오버레이 */}
            <AnimatePresence>
                {countdownNum !== '' && (
                    <motion.div 
                        className={styles.countdownOverlay}
                        initial={{ opacity: 0, scale: 1.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.3 }}
                    >
                        <motion.span 
                            key={countdownNum}
                            className={`${styles.countdownNumber} ${countdownNum === 'GO!' ? styles.countdownGo : ''}`}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                        >
                            {countdownNum}
                        </motion.span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 상단 대결 바 (Center-Towing) */}
            <div className={styles.scoreboard}>
                <div className={styles.trackWrapper}>
                    <div className={styles.centerLine} />
                    
                    {/* 방장 (Host) - 왼쪽에서 시작 */}
                    <motion.div 
                        className={`${styles.pawn} ${styles.pawnHost}`}
                        animate={{ left: `calc(${hostPos}% + 4px)` }}
                        transition={{ type: 'spring', damping: 20 }}
                    >
                        <span>👑</span>
                        <div className={styles.labelTag}>{isHost ? '나' : '상대'}</div>
                    </motion.div>

                    {/* 참가자 (Guest) - 오른쪽에서 시작 */}
                    <motion.div 
                        className={`${styles.pawn} ${styles.pawnGuest}`}
                        animate={{ right: `calc(${guestPos}% + 4px)` }}
                        transition={{ type: 'spring', damping: 20 }}
                    >
                        <span>😎</span>
                        <div className={styles.labelTag}>{!isHost ? '나' : '상대'}</div>
                    </motion.div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginTop: '10px' }}>
                    <span style={{ fontWeight: 800, color: '#4338ca' }}>{isHost ? myScore : opponentScore} pt</span>
                    <span style={{ fontWeight: 800, color: '#059669' }}>{isHost ? opponentScore : myScore} pt</span>
                </div>
            </div>

            {/* 퀴즈 영역 */}
            <div className={styles.card}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={spring}
                        className={styles.questionArea}
                    >
                        <p className={styles.label} style={{ marginBottom: '1rem' }}>Q. 다음 단어의 뜻은?</p>
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
                                disabled={selected !== null || quizState !== 'playing'}
                                whileTap={{ scale: 0.95 }}
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
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            <p>정답은 <strong>{current.correct}</strong> 입니다.</p>
                            <button className={styles.btnSecondary} style={{ marginTop: '1rem' }} onClick={handleNext}>다음 문제 →</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
