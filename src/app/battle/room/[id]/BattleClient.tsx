'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Word } from '@/types/vocabulary'
import { Timer, Trophy, Medal, ArrowLeft, CheckCircle2, Swords } from 'lucide-react'
import { getTierInfo } from '@/lib/tierSystem'
import type { Level } from '@/types/vocabulary'
import styles from '../room.module.css'
import confetti from 'canvas-confetti'

interface RoomData {
    id: string
    room_code: string
    host_id: number
    participant_ids: number[]
    max_players: number
    status: 'waiting' | 'playing' | 'finished'
    level: string
    set_no: number
    question_ids: number[] | null
    finished_at: string | null
    mode: 'normal' | 'revenge'
    question_count: number
}

interface Props {
    room: RoomData
    myId: number
}

type QuizState = 'playing' | 'wrong' | 'finished' | 'countdown' | 'afk_lost'

interface QuizQuestion {
    word: Word
    options: string[]
    correct: string
    useSentence: boolean
    sentenceWithBlank: string | null
    isIdiom: boolean
}

interface LeaderEntry {
    id: number
    score: number
    name: string
    isMe: boolean
    isLeft: boolean
}

function buildQuiz(words: Word[]): QuizQuestion[] {
    const allMeanings = words.map(w => w.mean_1)
    const allWords = words.map(w => w.word)

    return words.map((word, i) => {
        const hasSentence = word.example_sentence &&
            word.example_sentence.toLowerCase().includes(word.word.toLowerCase())
        const sentenceWithBlank = hasSentence
            ? word.example_sentence!.replace(
                new RegExp(word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '____')
            : null
        const useSentence = !!sentenceWithBlank

        // 문장 문제: 선지=영단어, 정답=영단어 / 일반 문제: 선지=뜻, 정답=뜻
        const pool = useSentence ? allWords : allMeanings
        const correct = useSentence ? word.word : word.mean_1

        const w1 = pool[(i + 1) % pool.length]
        const w2 = pool[(i + 2) % pool.length]
        const w3 = pool[(i + 3) % pool.length]

        let wrongs = Array.from(new Set([w1, w2, w3])).filter(m => m !== correct)
        let fallbackIdx = 0
        while (wrongs.length < 3) { wrongs.push(`(보기 ${word.id}_${++fallbackIdx})`); }
        wrongs = wrongs.slice(0, 3)

        const options = [correct, ...wrongs].sort((a, b) => {
            const sumA = a.length + (a.charCodeAt(0) || 0)
            const sumB = b.length + (b.charCodeAt(0) || 0)
            return (sumA % 5) - (sumB % 5)
        })

        const isIdiom = word.type === 'idiom'
        return { word, options, correct, useSentence, sentenceWithBlank, isIdiom }
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

function renderSentenceWithBlank(sentence: string) {
    const parts = sentence.split('____')
    return parts.map((part, i) => (
        <span key={i}>
            {part}
            {i < parts.length - 1 && (
                <span className={styles.blankBox}>____</span>
            )}
        </span>
    ))
}

/** 문제 타입 + 레벨에 따른 타이머(초) 산정 */
function getTimerSec(word: Word, useSentence: boolean): number {
    if (word.type === 'idiom') {
        // 고등 숙어: 10초, 그 외 숙어: 8초
        const lv = word.level || ''
        return lv.startsWith('high') ? 10 : 8
    }
    return useSentence ? 8 : 4
}

const spring: Transition = { type: 'spring', stiffness: 420, damping: 30 }

export default function BattleClient({ room, myId }: Props) {
    const supabase = createClient()
    const [quiz, setQuiz] = useState<QuizQuestion[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [index, setIndex] = useState(0)
    const [selected, setSelected] = useState<string | null>(null)
    const [quizState, setQuizState] = useState<QuizState>('countdown')
    const [countdownNum, setCountdownNum] = useState<number | string>(3)

    // N인 점수 추적
    const [scores, setScores] = useState<Record<number, number>>({})
    const scoresRef = useRef<Record<number, number>>({})
    const [participantNames, setParticipantNames] = useState<Record<number, string>>({})

    // 타이머
    const [timerProgress, setTimerProgress] = useState(100)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // 탈주 방지
    const afkCountRef = useRef(0)

    // 오답 단어 추적 (내 오답 + 다른 참여자 오답)
    const wrongWordsRef = useRef<number[]>([])
    const allWrongWordsRef = useRef<Record<number, number[]>>({})

    // 리벤지 모드: 졸업 단어 추적
    const [graduatedWords, setGraduatedWords] = useState<string[]>([])

    // 이탈한 유저 추적
    const [leftPlayers, setLeftPlayers] = useState<Set<number>>(new Set())
    const leftPlayersRef = useRef<Set<number>>(new Set())

    // 승패 기록 중복 방지
    const historySavedRef = useRef(false)

    // Broadcast 채널 ref
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

    const isOriginalHost = Number(room.host_id) === Number(myId)
    const [isActingHost, setIsActingHost] = useState(false)
    const isHost = isOriginalHost || isActingHost
    const myScore = scores[myId] || 0
    const tierInfo = room.level ? getTierInfo(room.level as Level) : null

    // scores ref 동기화
    useEffect(() => { scoresRef.current = scores }, [scores])
    useEffect(() => { leftPlayersRef.current = leftPlayers }, [leftPlayers])

    // 참여자 이름 조회
    useEffect(() => {
        const ids = room.participant_ids || []
        if (ids.length === 0) return
        async function fetchNames() {
            const { data } = await supabase.from('profiles').select('id, name').in('id', ids)
            if (data) {
                const names: Record<number, string> = {}
                data.forEach(p => { names[p.id] = p.name || '익명' })
                setParticipantNames(names)
            }
        }
        fetchNames()
    }, [room.participant_ids, supabase])

    const isRevenge = room.mode === 'revenge'

    // 1. 데이터 로드 (최초 1회만 실행)
    const dataLoadedRef = useRef(false)
    useEffect(() => {
        if (dataLoadedRef.current) return
        dataLoadedRef.current = true

        async function fetchWords() {
            let orderedWords: Word[] = []

            if (isRevenge) {
                const { data: wrongData } = await supabase
                    .from('wrong_answers')
                    .select('word_id')
                    .eq('user_id', myId)
                    .eq('status', 'Learning')
                    .order('wrong_count', { ascending: false })
                    .limit(room.question_count || 10)

                if (wrongData && wrongData.length > 0) {
                    const wordIds = wrongData.map(d => d.word_id)
                    const { data: words } = await supabase
                        .from('words').select('*').in('id', wordIds)
                    if (words && words.length > 0) {
                        orderedWords = [...(words as Word[])].sort(() => Math.random() - 0.5)
                    }
                }
            } else if (room.question_ids && room.question_ids.length > 0) {
                const { data } = await supabase
                    .from('words').select('*').in('id', room.question_ids)
                if (data && data.length > 0) {
                    const wordMap = new Map((data as Word[]).map(w => [w.id, w]))
                    orderedWords = room.question_ids
                        .map(id => wordMap.get(id))
                        .filter((w): w is Word => !!w)
                }
            } else {
                const { data } = await supabase
                    .from('words').select('*')
                    .eq('level', room.level).eq('set_no', room.set_no)
                if (data && data.length > 0) {
                    orderedWords = [...(data as Word[])].sort((a, b) => a.id - b.id)
                }
            }

            if (orderedWords.length > 0) {
                setQuiz(buildQuiz(orderedWords))
            }

            const initial: Record<number, number> = {}
            ;(room.participant_ids || []).forEach(id => { initial[id] = 0 })
            setScores(initial)

            setIsLoading(false)
        }
        fetchWords()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // 2. 카운트다운
    useEffect(() => {
        if (isLoading) return
        let timer: NodeJS.Timeout
        if (typeof countdownNum === 'number') {
            timer = setTimeout(() => {
                if (countdownNum > 1) setCountdownNum(countdownNum - 1)
                else setCountdownNum('GO!')
            }, 1000)
        } else if (countdownNum === 'GO!') {
            timer = setTimeout(() => { setQuizState('playing'); setCountdownNum('') }, 800)
        }
        return () => clearTimeout(timer)
    }, [countdownNum, isLoading])

    // 3. Broadcast 채널 (N인 점수 교환)
    useEffect(() => {
        const channel = supabase.channel(`battle:${room.id}`, {
            config: { broadcast: { self: false } },
        })

        channel
            .on('broadcast', { event: 'score_update' }, (payload) => {
                const { userId, score } = payload.payload
                if (userId !== myId) {
                    setScores(prev => ({ ...prev, [userId]: score }))
                }
            })
            .on('broadcast', { event: 'battle_finished' }, (payload) => {
                if (payload.payload.userId !== myId) {
                    setScores(prev => ({ ...prev, [payload.payload.userId]: payload.payload.finalScore }))
                    if (payload.payload.wrongWords) {
                        allWrongWordsRef.current[payload.payload.userId] = payload.payload.wrongWords
                    }
                }
            })
            .on('broadcast', { event: 'player_left' }, (payload) => {
                const leftId = payload.payload.userId
                if (leftId !== myId) {
                    setLeftPlayers(prev => new Set(prev).add(leftId))
                    setScores(prev => ({ ...prev, [leftId]: 0 }))

                    // 방장이 이탈한 경우: 대리 방장 승격
                    if (leftId === room.host_id) {
                        const participants = room.participant_ids || []
                        const nextHost = participants.find(id => id !== room.host_id && id !== leftId)
                        if (nextHost === myId) {
                            setIsActingHost(true)
                            console.log('[battle] 방장 player_left → 대리 방장 승격')
                        }
                    }
                }
            })
            .subscribe()

        channelRef.current = channel

        return () => {
            supabase.removeChannel(channel)
            channelRef.current = null
        }
    }, [room.id, myId, supabase])

    // 배틀 중 Presence 추적 (전원 참여) + 방장 이탈 감지 → 대리 방장 승격
    useEffect(() => {
        const presenceChannel = supabase.channel(`battle-presence:${room.id}`)

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                // 방장은 감지 불필요
                if (isOriginalHost) return

                const state = presenceChannel.presenceState()
                const onlineIds = Object.values(state)
                    .flat()
                    .map((p: Record<string, unknown>) => p.user_id as number)

                const hostOffline = !onlineIds.includes(room.host_id)
                if (!hostOffline) return

                // 온라인 참여자 중 방장이 아닌 첫 번째가 대리 방장
                const participants = room.participant_ids || []
                const nextHost = participants.find(
                    id => id !== room.host_id && onlineIds.includes(id)
                )
                if (nextHost === myId) {
                    setIsActingHost(true)
                    console.log('[battle] 방장 이탈 감지 → 대리 방장 승격')
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ user_id: myId })
                }
            })

        return () => { supabase.removeChannel(presenceChannel) }
    }, [room.id, room.host_id, room.participant_ids, myId, isOriginalHost, supabase])

    // 자동 발음 (문장 문제가 아닐 때만 — 문장 문제에서는 정답 힌트가 됨)
    useEffect(() => {
        if (quizState !== 'playing') return
        const q = quizRef.current[index]
        if (!q || (q.useSentence && q.sentenceWithBlank)) return
        const timer = setTimeout(() => speak(q.word.word), 500)
        return () => clearTimeout(timer)
    }, [index, quizState])

    // 4. 퀴즈 타이머
    const startTimer = useCallback((durationSec: number) => {
        if (timerRef.current) clearInterval(timerRef.current)
        setTimerProgress(100)
        const totalMs = durationSec * 1000
        const intervalMs = 10
        const step = (intervalMs / totalMs) * 100

        timerRef.current = setInterval(() => {
            setTimerProgress(prev => {
                const next = prev - step
                if (next <= 0) {
                    if (timerRef.current) clearInterval(timerRef.current)
                    return 0
                }
                return next
            })
        }, intervalMs)
    }, [])

    const stopTimer = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }, [])

    // 타임아웃 처리 → handleSelect로 통합
    useEffect(() => {
        if (timerProgress > 0 || quizState !== 'playing') return
        handleSelect('__timeout__')
    }, [timerProgress, quizState]) // eslint-disable-line react-hooks/exhaustive-deps

    // quiz를 ref로도 보관 (타이머 effect에서 참조하되 의존성에 넣지 않음)
    const quizRef = useRef<QuizQuestion[]>([])
    useEffect(() => { quizRef.current = quiz }, [quiz])

    // 문제 변경 시 타이머 시작
    useEffect(() => {
        if (quizState !== 'playing' || quizRef.current.length === 0) return
        const current = quizRef.current[index]
        startTimer(current ? getTimerSec(current.word, current.useSentence) : 4)
        return () => stopTimer()
    }, [index, quizState, startTimer, stopTimer])

    // 점수 브로드캐스트
    const broadcastScore = useCallback((newScore: number) => {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'score_update',
            payload: { userId: myId, score: newScore }
        })
    }, [myId])

    // 5. 승패 기록 저장 (N인 대전)
    const saveBattleHistory = useCallback(async (isAfkLoss: boolean) => {
        if (historySavedRef.current) return
        historySavedRef.current = true

        const myFinalScore = scoresRef.current[myId] || 0

        // 내 최종 점수 + 오답 브로드캐스트
        channelRef.current?.send({
            type: 'broadcast',
            event: 'battle_finished',
            payload: { userId: myId, finalScore: myFinalScore, wrongWords: wrongWordsRef.current }
        })

        // 방장만 기록 저장
        if (!isHost) return

        // 다른 참여자 데이터 수신 대기
        await new Promise(resolve => setTimeout(resolve, 2000))

        const finalScores = { ...scoresRef.current }
        const participantIds = room.participant_ids || []
        const left = leftPlayersRef.current

        // 이탈자 점수 0점 확정
        left.forEach(id => { finalScores[id] = 0 })

        // 승자 결정 (이탈자 제외)
        const activePlayers = Object.entries(finalScores).filter(([id]) => !left.has(Number(id)))
        const maxScore = activePlayers.length > 0
            ? Math.max(...activePlayers.map(([, s]) => s), 0) : 0
        const topPlayers = activePlayers.filter(([, s]) => s === maxScore)
        let winnerId: number | null = null

        if (isAfkLoss) {
            const others = activePlayers.filter(([id]) => Number(id) !== myId)
            const topOther = others.sort(([, a], [, b]) => b - a)[0]?.[0]
            winnerId = topOther != null ? Number(topOther) : null
        } else if (topPlayers.length === 1) {
            winnerId = Number(topPlayers[0][0])
        }

        // 전체 프로필 조회 (한 번에)
        const { data: profiles } = await supabase
            .from('profiles').select('id, name, NsiteID').in('id', participantIds)
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
        const academyId: number | null = profileMap.get(myId)?.NsiteID || null

        // 전원 오답 합산 (리벤지 모드는 이미 개별 추적하므로 null)
        let wrongWordsData: Record<number, number[]> | null = null
        if (!isRevenge) {
            wrongWordsData = { ...allWrongWordsRef.current }
            if (wrongWordsRef.current.length > 0) {
                wrongWordsData[myId] = wrongWordsRef.current
            }
        }

        const { data: insertedHistory } = await supabase.from('battle_history').insert({
            room_id: room.id,
            participants_ids: participantIds,
            scores: finalScores,
            winner_id: winnerId,
            wrong_words: wrongWordsData,
            NsiteID: academyId,
        }).select('id').single()

        // 학원 피드
        if (academyId && winnerId && insertedHistory) {
            const sortedEntries = Object.entries(finalScores).sort(([, a], [, b]) => b - a)
            const winnerName = profileMap.get(winnerId)?.name || '익명'
            const runnerUpId = sortedEntries[1]?.[0]
            const runnerUpName = runnerUpId ? (profileMap.get(Number(runnerUpId))?.name || '익명') : '상대'

            supabase.channel(`academy_feed:${academyId}`).send({
                type: 'broadcast',
                event: 'battle_result',
                payload: {
                    id: insertedHistory.id,
                    winner_name: winnerName,
                    loser_name: runnerUpName,
                    winner_score: sortedEntries[0]?.[1] || 0,
                    loser_score: sortedEntries[1]?.[1] || 0,
                    participant_count: participantIds.length,
                    created_at: new Date().toISOString(),
                },
            })
        }

        await supabase.from('battle_rooms')
            .update({ status: 'finished', finished_at: new Date().toISOString() })
            .eq('id', room.id)
    }, [isHost, room, myId, supabase])

    // 퀴즈 종료/AFK 시 기록 저장
    useEffect(() => {
        if (quizState === 'finished') {
            saveBattleHistory(false)

            // 리더보드에서 내가 1위면 confetti
            const entries = Object.entries(scoresRef.current).sort(([, a], [, b]) => b - a)
            const topScore = entries[0]?.[1] || 0
            const myS = scoresRef.current[myId] || 0
            const isOnlyWinner = myS === topScore && entries.filter(([, s]) => s === topScore).length === 1
            if (isOnlyWinner) {
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#a5b4fc', '#f9a8d4'] })
            }
        } else if (quizState === 'afk_lost') {
            saveBattleHistory(true)
        }
    }, [quizState]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { return () => stopTimer() }, [stopTimer])

    // 이탈 감지: 페이지 이탈 시 0점 패배 브로드캐스트
    useEffect(() => {
        if (quizState === 'finished' || quizState === 'afk_lost') return

        function broadcastLeave() {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'player_left',
                payload: { userId: myId },
            })
        }

        window.addEventListener('beforeunload', broadcastLeave)
        return () => window.removeEventListener('beforeunload', broadcastLeave)
    }, [myId, quizState])

    // 5분 자동 정리
    useEffect(() => {
        if (quizState !== 'finished' && quizState !== 'afk_lost') return
        const timer = setTimeout(() => { window.location.href = '/study' }, 5 * 60 * 1000)
        return () => clearTimeout(timer)
    }, [quizState])

    if (isLoading) return <div className={styles.loader}>{isRevenge ? '리벤지 배틀 준비 중...' : '영단어 전쟁 준비 중...'}</div>
    if (quiz.length === 0) return (
        <div className={`${styles.card} ${styles.winnerCard}`}>
            <div className={styles.resultEmoji}>{isRevenge ? '📝' : '❌'}</div>
            <h2 className={styles.title}>
                {isRevenge ? '오답 단어가 없습니다' : '데이터가 없습니다'}
            </h2>
            {isRevenge && (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                    학습 퀴즈나 일반 배틀에서 틀린 단어가 있어야 리벤지 배틀에 참여할 수 있습니다.
                </p>
            )}
            <button className={styles.btnPrimary} style={{ marginTop: '1.5rem' }}
                onClick={() => window.location.href = '/study'}>돌아가기</button>
        </div>
    )

    const current = quiz[index]
    const total = quiz.length
    const timerColor = timerProgress > 50 ? '#06b6d4' : timerProgress > 25 ? '#6366f1' : '#ef4444'
    const timerDuration = current ? getTimerSec(current.word, current.useSentence) : 4

    // 리더보드 계산
    const leaderboard: LeaderEntry[] = Object.entries(scores)
        .map(([idStr, score]) => {
            const id = Number(idStr)
            return {
                id, score,
                name: participantNames[id] || '???',
                isMe: id === myId,
                isLeft: leftPlayers.has(id),
            }
        })
        .sort((a, b) => {
            // 이탈자는 항상 하단
            if (a.isLeft !== b.isLeft) return a.isLeft ? 1 : -1
            return b.score - a.score
        })

    function handleSelect(option: string) {
        if (selected !== null || quizState !== 'playing') return
        setSelected(option)
        stopTimer()

        if (option === '__timeout__') {
            afkCountRef.current += 1
            if (afkCountRef.current >= 2) { setQuizState('afk_lost'); return }
        } else {
            afkCountRef.current = 0
        }

        if (option === current.correct) {
            const nextScore = myScore + 1
            setScores(prev => ({ ...prev, [myId]: nextScore }))
            broadcastScore(nextScore)

            // 리벤지 모드: 졸업 추적
            if (isRevenge) {
                supabase.rpc('record_revenge_correct', {
                    p_user_id: myId, p_word_id: current.word.id,
                }).then(({ data: status }) => {
                    if (status === 'Mastered') {
                        setGraduatedWords(prev => [...prev, current.word.word])
                    }
                })
            }

            setTimeout(() => {
                if (index + 1 >= total) setQuizState('finished')
                else { setIndex(i => i + 1); setSelected(null) }
            }, 600)
        } else {
            wrongWordsRef.current.push(current.word.id)

            // 리벤지 모드: 연속 정답 초기화
            if (isRevenge && option !== '__timeout__') {
                supabase.rpc('record_revenge_wrong', {
                    p_user_id: myId, p_word_id: current.word.id,
                })
            }

            setQuizState('wrong')

            // 1.2초 후 자동으로 다음 문제
            setTimeout(() => {
                if (index + 1 >= total) setQuizState('finished')
                else { setIndex(i => i + 1); setSelected(null); setQuizState('playing') }
            }, 1200)
        }
    }

    // ── AFK 패배 화면 ──
    if (quizState === 'afk_lost') {
        return (
            <motion.div className={`${styles.card} ${styles.winnerCard}`}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={spring}>
                <div className={styles.resultEmoji}>🚪</div>
                <h2 className={styles.title}>응답 없음 - 자동 패배</h2>
                <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '0.5rem' }}>
                    연속 미응답으로 자동 패배 처리되었습니다.
                </p>
                <button className={styles.btnPrimary} style={{ marginTop: '2rem' }}
                    onClick={() => window.location.href = '/study'}>돌아가기</button>
            </motion.div>
        )
    }

    // ── 결과 화면 (N인 리더보드) ──
    if (quizState === 'finished') {
        const topScore = leaderboard[0]?.score || 0
        const myRank = leaderboard.findIndex(e => e.isMe) + 1
        const tiedAtTop = leaderboard.filter(e => e.score === topScore).length
        const isWin = myRank === 1 && tiedAtTop === 1
        const isTie = myScore === topScore && tiedAtTop > 1

        return (
            <motion.div className={`${styles.card} ${styles.winnerCard}`}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={spring}>
                <div className={styles.resultEmoji}>{isTie ? '🤝' : (isWin ? '🏆' : '🥲')}</div>
                <h2 className={styles.title}>
                    {isTie ? '무승부!' : (isWin ? '1위 달성!' : `${myRank}위`)}
                </h2>

                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    width: '100%', margin: '1rem 0', maxHeight: '280px', overflowY: 'auto',
                }}>
                    {leaderboard.map((entry, rank) => (
                        <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: rank * 0.05 }}
                            className={`${styles.resultEntry} ${entry.isMe ? styles.resultEntryMe : styles.resultEntryOther} ${entry.isLeft ? styles.resultEntryLeft : ''}`}
                        >
                            <span className={styles.resultRank}>
                                {entry.isLeft ? '🚪' : rank === 0 ? <Trophy size={18} style={{ color: '#eab308' }} /> : rank === 1 ? <Medal size={18} style={{ color: '#94a3b8' }} /> : rank === 2 ? <Medal size={18} style={{ color: '#cd7f32' }} /> : `${rank + 1}.`}
                                <span style={{ marginLeft: '4px' }}>
                                    {entry.name}{entry.isLeft ? ' (이탈)' : entry.isMe ? ' (나)' : ''}
                                </span>
                                {tierInfo && !entry.isLeft && (
                                    <span
                                        className={styles.tierBadge}
                                        style={{ color: tierInfo.color, background: tierInfo.bg, borderColor: tierInfo.color }}
                                    >
                                        {tierInfo.label}
                                    </span>
                                )}
                            </span>
                            <span className={styles.resultPt}>{entry.isLeft ? '0pt' : `${entry.score}pt`}</span>
                        </motion.div>
                    ))}
                </div>

                {/* 리벤지 모드: 졸업 단어 표시 */}
                {isRevenge && graduatedWords.length > 0 && (
                    <div className={styles.graduatedBox}>
                        <p className={styles.graduatedTitle}>
                            <CheckCircle2 size={16} style={{ verticalAlign: '-3px' }} /> 졸업한 단어 ({graduatedWords.length}개)
                        </p>
                        <div className={styles.graduatedList}>
                            {graduatedWords.map(w => (
                                <span key={w} className={styles.graduatedWord}>{w}</span>
                            ))}
                        </div>
                    </div>
                )}

                {isRevenge && (
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                        각 플레이어가 자신의 오답 단어로 대결했습니다
                    </p>
                )}

                <button className={styles.btnPrimary} style={{ marginTop: '1rem' }}
                    onClick={() => window.location.href = '/study'}>
                    <ArrowLeft size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '4px' }} />
                    돌아가기
                </button>
            </motion.div>
        )
    }

    // 내 순위 계산
    const myRankLive = leaderboard.findIndex(e => e.isMe) + 1

    // ── 게임 진행 화면 ──
    return (
        <div className={styles.battleWrap}>
            {/* 카운트다운 */}
            <AnimatePresence>
                {countdownNum !== '' && (
                    <motion.div className={styles.countdownOverlay}
                        initial={{ opacity: 0, scale: 1.5 }} animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.3 }}>
                        <motion.span key={countdownNum}
                            className={`${styles.countdownNumber} ${countdownNum === 'GO!' ? styles.countdownGo : ''}`}
                            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                            {countdownNum}
                        </motion.span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── 상단 헤더: 진행률 + 실시간 순위 ── */}
            <div className={styles.battleHeader}>
                <div className={styles.battleProgress}>
                    <span className={styles.battleProgressLabel}>{index + 1} / {total}</span>
                    <div className={styles.battleProgressBar}>
                        <motion.div
                            className={styles.battleProgressFill}
                            animate={{ width: `${((index + 1) / total) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>
                {/* 타입 배지: 단어/숙어 */}
                <motion.div
                    key={current.isIdiom ? 'idiom' : 'word'}
                    className={`${styles.typeBadge} ${current.isIdiom ? styles.typeBadgeIdiom : styles.typeBadgeWord}`}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                    {current.isIdiom ? '🔗 숙어' : '📝 단어'} · {timerDuration}초
                </motion.div>
                {isRevenge && (
                    <div className={styles.revengeBadge}>
                        <Swords size={12} /> 리벤지
                    </div>
                )}
            </div>

            {/* ── 실시간 점수판 ── */}
            <div className={styles.liveScoreboard}>
                {leaderboard.slice(0, 5).map((entry, rank) => (
                    <motion.div
                        key={entry.id}
                        layout
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`${styles.liveScoreItem} ${entry.isMe ? styles.liveScoreMe : ''} ${entry.isLeft ? styles.liveScoreLeft : ''}`}
                    >
                        <span className={styles.liveRank}>
                            {entry.isLeft ? '🚪' : rank === 0 ? '👑' : `${rank + 1}`}
                        </span>
                        <span className={styles.livePlayerName}>
                            {entry.name}{entry.isLeft ? ' (이탈)' : ''}
                        </span>
                        {tierInfo && !entry.isLeft && (
                            <span
                                className={styles.tierBadgeSm}
                                style={{ color: tierInfo.color }}
                            >
                                {tierInfo.label}
                            </span>
                        )}
                        <motion.span
                            key={entry.score}
                            className={styles.livePlayerScore}
                            initial={{ scale: 1.4 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            {entry.score}
                        </motion.span>
                    </motion.div>
                ))}
                {leaderboard.length > 5 && (
                    <span className={styles.liveMore}>+{leaderboard.length - 5}명</span>
                )}
            </div>

            {/* ── 타이머 게이지 ── */}
            <div className={styles.battleTimerWrap}>
                <div className={styles.timerBar}>
                    <motion.div
                        className={`${styles.timerFill} ${timerProgress <= 25 ? styles.timerBlink : ''}`}
                        style={{ width: `${timerProgress}%`, backgroundColor: timerColor }}
                    />
                </div>
                <div className={styles.timerLabel}>
                    <span className={styles.timerIcon}>
                        <Timer size={12} /> {timerDuration}초
                    </span>
                    <span className={`${styles.timerCount} ${timerProgress <= 25 ? styles.timerCountUrgent : ''}`}>
                        {Math.ceil((timerProgress / 100) * timerDuration)}초
                    </span>
                </div>
            </div>

            {/* ── 중앙 단어 카드 ── */}
            <div className={styles.battleCard}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 60, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -60, scale: 0.95 }}
                        transition={spring}
                        className={styles.questionArea}
                    >
                        {current.useSentence && current.sentenceWithBlank ? (
                            <>
                                <p className={styles.sentenceLabel}>Q. 빈칸에 들어갈 단어는?</p>
                                <div className={styles.sentenceBox}>
                                    <p className={styles.sentenceText}>
                                        &ldquo;{renderSentenceWithBlank(current.sentenceWithBlank)}&rdquo;
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className={styles.sentenceLabel}>
                                    Q. 다음 {current.isIdiom ? '숙어' : '단어'}의 뜻은?
                                </p>
                                <h2 className={`${styles.questionWord} ${current.isIdiom ? styles.questionWordIdiom : ''}`}>
                                    {current.word.word}
                                </h2>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* ── 하단 선택지 ── */}
                <div className={styles.optionsGrid}>
                    {current.options.map((opt, i) => {
                        let cls = styles.quizOption
                        if (selected !== null) {
                            if (opt === current.correct) cls = `${styles.quizOption} ${styles.optCorrect}`
                            else if (opt === selected && selected !== '__timeout__') cls = `${styles.quizOption} ${styles.optWrong}`
                            else cls = `${styles.quizOption} ${styles.optDim}`
                        }
                        return (
                            <motion.button
                                key={i}
                                className={cls}
                                onClick={() => handleSelect(opt)}
                                disabled={selected !== null || quizState !== 'playing'}
                                whileTap={selected === null ? { scale: 0.93 } : {}}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ ...spring, delay: i * 0.04 }}
                            >
                                {opt}
                            </motion.button>
                        )
                    })}
                </div>

                {/* 오답 피드백 (자동 넘김) */}
                <AnimatePresence>
                    {quizState === 'wrong' && (
                        <motion.div className={styles.wrongFeedback}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <p>
                                {selected === '__timeout__' ? '⏰ 시간 초과! ' : ''}
                                정답은 <strong>{current.correct}</strong>
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
