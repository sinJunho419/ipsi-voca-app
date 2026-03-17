'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Word } from '@/types/vocabulary'
import { BookX, Swords, RotateCcw, CheckCircle2, XCircle, ArrowLeft, Users, AlertTriangle, GraduationCap, List } from 'lucide-react'
import confetti from 'canvas-confetti'
import QuizTimerBar from './QuizTimerBar'
import styles from './study.module.css'

interface WrongWordEntry {
    id: number
    word_id: number
    wrong_count: number
    consecutive_correct: number
    status: string
    last_wrong_at: string
    word: Word
}

interface RevengeQuestion {
    entry: WrongWordEntry
    options: string[]
    correct: string
}

type Mode = 'list' | 'revenge'
type QuizState = 'playing' | 'wrong' | 'finished'
type ListFilter = 'all' | 'danger' | 'near_grad' | 'graduated'
type TypeFilter = 'all' | 'word' | 'idiom'

/** 문제 타입 + 레벨에 따른 타이머(초) 산정 */
function getTimerSec(word: Word): number {
    if (word.type === 'idiom') {
        const lv = word.level || ''
        return lv.startsWith('high') ? 10 : 8
    }
    return 4
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

interface Props {
    onExit: () => void
}

export default function WrongWordsClient({ onExit }: Props) {
    const supabase = createClient()
    const router = useRouter()
    const [userId, setUserId] = useState<number | null>(null)
    const [isLocalUser, setIsLocalUser] = useState(false)
    const [wrongWords, setWrongWords] = useState<WrongWordEntry[]>([])
    const [masteredWords, setMasteredWords] = useState<WrongWordEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [mode, setMode] = useState<Mode>('list')
    const [creatingBattle, setCreatingBattle] = useState(false)
    const [listFilter, setListFilter] = useState<ListFilter>('all')
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

    // Revenge quiz state
    const [quiz, setQuiz] = useState<RevengeQuestion[]>([])
    const [index, setIndex] = useState(0)
    const [selected, setSelected] = useState<string | null>(null)
    const [score, setScore] = useState(0)
    const [graduated, setGraduated] = useState<string[]>([])
    const [timerReset, setTimerReset] = useState(0)
    const [quizState, setQuizState] = useState<QuizState>('playing')

    // 연속 정답 로컬 추적
    const [consecutiveMap, setConsecutiveMap] = useState<Record<number, number>>({})

    // 발음
    const prevIndexRef = useRef(-1)

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const loginInfoId = user.user_metadata?.login_info_id as number
                setUserId(loginInfoId)
                await fetchWrongWords(loginInfoId)
            } else {
                // 비로그인: localStorage에서 오답 불러오기
                setIsLocalUser(true)
                await fetchLocalWrongWords()
            }
        }
        init()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    async function fetchLocalWrongWords() {
        setIsLoading(true)
        try {
            const stored: Record<string, { wrong_count: number; consecutive_correct: number; status: string; last_wrong_at: string }> = JSON.parse(localStorage.getItem('local_wrong_words') || '{}')
            const entries = Object.entries(stored)
            if (entries.length === 0) {
                setWrongWords([]); setMasteredWords([]); setIsLoading(false); return
            }

            const wordIds = entries.map(([id]) => Number(id))
            const { data: words } = await supabase.from('words').select('*').in('id', wordIds)
            const wordMap = new Map((words || []).map(w => [w.id, w as Word]))

            const learning: WrongWordEntry[] = []
            const mastered: WrongWordEntry[] = []
            for (const [idStr, info] of entries) {
                const wid = Number(idStr)
                const w = wordMap.get(wid)
                if (!w) continue
                const entry: WrongWordEntry = {
                    id: wid, word_id: wid,
                    wrong_count: info.wrong_count,
                    consecutive_correct: info.consecutive_correct,
                    status: info.status,
                    last_wrong_at: info.last_wrong_at,
                    word: w,
                }
                if (info.status === 'Mastered') mastered.push(entry)
                else learning.push(entry)
            }
            learning.sort((a, b) => b.wrong_count - a.wrong_count)
            setWrongWords(learning)
            setMasteredWords(mastered)

            const cMap: Record<number, number> = {}
            learning.forEach(e => { cMap[e.word_id] = e.consecutive_correct })
            setConsecutiveMap(cMap)
        } catch { setWrongWords([]); setMasteredWords([]) }
        setIsLoading(false)
    }

    function saveLocalWrongWord(wordId: number, correct: boolean) {
        try {
            const stored: Record<string, { wrong_count: number; consecutive_correct: number; status: string; last_wrong_at: string }> = JSON.parse(localStorage.getItem('local_wrong_words') || '{}')
            const key = String(wordId)
            const entry = stored[key] || { wrong_count: 0, consecutive_correct: 0, status: 'Learning', last_wrong_at: '' }
            if (correct) {
                entry.consecutive_correct += 1
                if (entry.consecutive_correct >= 3) entry.status = 'Mastered'
            } else {
                entry.consecutive_correct = 0
            }
            entry.last_wrong_at = new Date().toISOString()
            stored[key] = entry
            localStorage.setItem('local_wrong_words', JSON.stringify(stored))
            return entry.status
        } catch { return 'Learning' }
    }

    async function fetchWrongWords(uid: number) {
        setIsLoading(true)

        // Learning 단어
        const { data } = await supabase
            .from('wrong_answers')
            .select('id, word_id, wrong_count, consecutive_correct, status, last_wrong_at')
            .eq('user_id', uid)
            .eq('status', 'Learning')
            .order('wrong_count', { ascending: false })

        // Mastered (졸업) 단어
        const { data: masteredData } = await supabase
            .from('wrong_answers')
            .select('id, word_id, wrong_count, consecutive_correct, status, last_wrong_at')
            .eq('user_id', uid)
            .eq('status', 'Mastered')
            .order('last_wrong_at', { ascending: false })

        const allData = [...(data || []), ...(masteredData || [])]

        if (allData.length === 0) {
            setWrongWords([])
            setMasteredWords([])
            setIsLoading(false)
            return
        }

        const wordIds = allData.map(d => d.word_id)
        const { data: words } = await supabase
            .from('words')
            .select('*')
            .in('id', wordIds)

        const wordMap = new Map((words || []).map(w => [w.id, w as Word]))

        const learningEntries: WrongWordEntry[] = (data || [])
            .filter(d => wordMap.has(d.word_id))
            .map(d => ({ ...d, word: wordMap.get(d.word_id)! }))

        const masteredEntries: WrongWordEntry[] = (masteredData || [])
            .filter(d => wordMap.has(d.word_id))
            .map(d => ({ ...d, word: wordMap.get(d.word_id)! }))

        setWrongWords(learningEntries)
        setMasteredWords(masteredEntries)

        // 연속 정답 맵 초기화
        const cMap: Record<number, number> = {}
        learningEntries.forEach(e => { cMap[e.word_id] = e.consecutive_correct })
        setConsecutiveMap(cMap)

        setIsLoading(false)
    }

    // 타입 필터 적용된 오답 목록
    const typeFilteredWrongWords = wrongWords.filter(e => {
        if (typeFilter === 'word') return e.word.type !== 'idiom'
        if (typeFilter === 'idiom') return e.word.type === 'idiom'
        return true
    })

    async function startRevengeQuiz() {
        const quizPool = typeFilteredWrongWords.length >= 4 ? typeFilteredWrongWords : wrongWords
        if (quizPool.length < 4) return

        // 오답 옵션용 단어 가져오기
        const { data: randomWords } = await supabase
            .from('words')
            .select('mean_1')
            .limit(50)

        const allMeanings = Array.from(new Set((randomWords || []).map(w => w.mean_1)))

        const shuffled = [...quizPool].sort(() => Math.random() - 0.5)

        const questions: RevengeQuestion[] = shuffled.map(entry => {
            const correct = entry.word.mean_1
            let wrongs = allMeanings
                .filter(m => m !== correct)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
            while (wrongs.length < 3) wrongs.push('(없음)')

            const options = [correct, ...wrongs].sort(() => Math.random() - 0.5)
            return { entry, options, correct }
        })

        setQuiz(questions)
        setIndex(0)
        setScore(0)
        setSelected(null)
        setGraduated([])
        setQuizState('playing')
        setTimerReset(t => t + 1)
        prevIndexRef.current = -1
        setMode('revenge')
    }

    // 자동 발음
    useEffect(() => {
        if (mode !== 'revenge' || quizState !== 'playing') return
        const word = quiz[index]?.entry.word.word
        if (!word || prevIndexRef.current === index) return
        prevIndexRef.current = index
        const timer = setTimeout(() => speak(word), 500)
        return () => clearTimeout(timer)
    }, [index, quiz, mode, quizState])

    function handleTimeout() {
        if (selected !== null || quizState !== 'playing') return
        handleSelect('__timeout__')
    }

    async function handleSelect(option: string) {
        if (selected !== null || (!userId && !isLocalUser)) return
        setSelected(option)

        const current = quiz[index]
        const isLocal = isLocalUser

        if (option === current.correct) {
            setScore(s => s + 1)

            let status: string | null = null
            if (isLocal) {
                status = saveLocalWrongWord(current.entry.word_id, true)
            } else {
                const { data } = await supabase.rpc('record_revenge_correct', {
                    p_user_id: userId,
                    p_word_id: current.entry.word_id,
                })
                status = data
            }

            const newCount = (consecutiveMap[current.entry.word_id] || 0) + 1
            setConsecutiveMap(prev => ({ ...prev, [current.entry.word_id]: newCount }))

            if (status === 'Mastered') {
                setGraduated(prev => [...prev, current.entry.word.word])
                confetti({
                    particleCount: 80,
                    spread: 60,
                    origin: { y: 0.7 },
                    colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
                })
            }

            setTimeout(() => {
                if (index + 1 >= quiz.length) setQuizState('finished')
                else { setIndex(i => i + 1); setSelected(null); setQuizState('playing'); setTimerReset(t => t + 1) }
            }, status === 'Mastered' ? 1200 : 800)
        } else {
            if (option !== '__timeout__') {
                if (isLocal) {
                    saveLocalWrongWord(current.entry.word_id, false)
                } else {
                    await supabase.rpc('record_revenge_wrong', {
                        p_user_id: userId,
                        p_word_id: current.entry.word_id,
                    })
                }
                setConsecutiveMap(prev => ({ ...prev, [current.entry.word_id]: 0 }))
            }
            setQuizState('wrong')
        }
    }

    // 오답 후 1.5초 자동 넘기기
    useEffect(() => {
        if (quizState !== 'wrong') return
        const timer = setTimeout(() => {
            if (index + 1 >= quiz.length) setQuizState('finished')
            else { setIndex(i => i + 1); setSelected(null); setQuizState('playing'); setTimerReset(t => t + 1) }
        }, 1500)
        return () => clearTimeout(timer)
    }, [quizState, index, quiz.length])

    function backToList() {
        setMode('list')
        if (isLocalUser) fetchLocalWrongWords()
        else if (userId) fetchWrongWords(userId)
    }

    async function createRevengeBattle() {
        if (!userId || isLocalUser || wrongWords.length < 4 || creatingBattle) return
        setCreatingBattle(true)

        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        const questionCount = Math.min(wrongWords.length, 10)

        const { data: room, error } = await supabase
            .from('battle_rooms')
            .insert({
                room_code: roomCode,
                host_id: userId,
                mode: 'revenge',
                question_count: questionCount,
                level: wrongWords[0].word.level,
                set_no: wrongWords[0].word.set_no,
                status: 'waiting',
                participant_ids: [userId],
                max_players: 50,
            })
            .select('id')
            .single()

        if (error || !room) {
            setCreatingBattle(false)
            alert('방 생성에 실패했습니다.')
            return
        }

        router.push(`/battle/room/${room.id}`)
    }

    // ── 로딩 / 미로그인 ──
    if (isLoading) {
        return (
            <motion.div className={`${styles.glass} ${styles.empty}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                로딩 중…
            </motion.div>
        )
    }

    if (!userId && !isLocalUser) {
        return (
            <motion.div className={`${styles.glass} ${styles.empty}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                로그인이 필요합니다.
            </motion.div>
        )
    }

    // ── 결과 화면 ──
    if (mode === 'revenge' && quizState === 'finished') {
        const pct = quiz.length > 0 ? Math.round((score / quiz.length) * 100) : 0
        return (
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
                <div className={`${styles.glass} ${styles.quizResult}`}>
                    <div className={styles.resultEmoji}>{pct === 100 ? '🏆' : pct >= 70 ? '👍' : '💪'}</div>
                    <h2 className={styles.resultTitle}>리벤지 퀴즈 완료!</h2>
                    <p className={styles.resultScore}>
                        <span className={styles.resultCorrect}>{score}</span>
                        <span className={styles.resultTotal}> / {quiz.length}</span>
                    </p>
                    <p className={styles.resultPct}>{pct}% 정답</p>

                    {graduated.length > 0 && (
                        <div className={styles.graduatedBox}>
                            <p className={styles.graduatedTitle}>
                                <CheckCircle2 size={18} style={{ verticalAlign: '-3px' }} /> 졸업 ({graduated.length}개)
                            </p>
                            <div className={styles.graduatedList}>
                                {graduated.map(w => (
                                    <span key={w} className={styles.graduatedWord}>{w}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <motion.button className={styles.retryBtn} onClick={startRevengeQuiz}
                            whileTap={{ scale: 0.93 }} transition={spring}>
                            <RotateCcw size={16} style={{ verticalAlign: '-3px', marginRight: '4px' }} />
                            다시 풀기
                        </motion.button>
                        <motion.button className={styles.retryBtn} onClick={backToList}
                            whileTap={{ scale: 0.93 }} transition={spring}
                            style={{ background: 'linear-gradient(135deg, #64748b, #94a3b8)' }}>
                            <ArrowLeft size={16} style={{ verticalAlign: '-3px', marginRight: '4px' }} />
                            목록으로
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        )
    }

    // ── 리벤지 퀴즈 진행 ──
    if (mode === 'revenge') {
        const current = quiz[index]
        if (!current) return null

        const progress = (index / quiz.length) * 100
        const currentConsecutive = consecutiveMap[current.entry.word_id] || 0
        const isIdiom = current.entry.word.type === 'idiom'
        const timerDuration = getTimerSec(current.entry.word)

        return (
            <div className={styles.quiz}>
                {/* 진행 바 */}
                <div className={`${styles.glass} ${styles.progressRow}`}>
                    <div className={styles.progressBar}>
                        <motion.div className={styles.progressFill}
                            animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                    </div>
                    <span className={styles.progressText}>{index + 1} / {quiz.length}</span>
                </div>

                {/* 타입 배지 + 동적 타이머 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <motion.span
                        key={isIdiom ? 'idiom' : 'word'}
                        className={`${styles.typeBadge} ${isIdiom ? styles.typeBadgeIdiom : styles.typeBadgeWord}`}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                        {isIdiom ? '🔗 숙어' : '📝 단어'} · {timerDuration}초
                    </motion.span>
                </div>

                {/* 타이머 */}
                <QuizTimerBar onTimeout={handleTimeout} resetTrigger={timerReset}
                    stopped={selected !== null} totalTimeSec={timerDuration} />

                {/* 연속 정답 게이지 */}
                <div className={styles.consecutiveRow}>
                    <div className={styles.consecutiveDots}>
                        {[0, 1, 2].map(i => (
                            <span key={i}
                                className={i < currentConsecutive ? styles.dotFilled : styles.dotEmpty}
                            />
                        ))}
                    </div>
                    <span className={styles.consecutiveLabel}>
                        {currentConsecutive}/3 연속 정답
                        {currentConsecutive >= 3 && ' ✓ 졸업!'}
                    </span>
                    <span className={styles.wrongCount}>
                        <XCircle size={12} /> {current.entry.wrong_count}회 틀림
                    </span>
                </div>

                {/* 졸업 토스트 */}
                <AnimatePresence>
                    {selected === current.correct && (consecutiveMap[current.entry.word_id] || 0) >= 3 && (
                        <motion.div className={styles.graduationToast}
                            initial={{ opacity: 0, scale: 0.8, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={spring}>
                            <GraduationCap size={20} />
                            <span>&ldquo;{current.entry.word.word}&rdquo; 졸업!</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 문제 */}
                <AnimatePresence mode="wait">
                    <motion.div key={index}
                        className={`${styles.glass} ${styles.quizQuestion}`}
                        initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }} transition={spring}>
                        <p className={`${styles.quizWord} ${isIdiom ? styles.quizWordIdiom : ''}`}>{current.entry.word.word}</p>
                    </motion.div>
                </AnimatePresence>

                {/* 선택지 */}
                <div className={styles.quizOptions}>
                    {current.options.map((opt, i) => {
                        let cls = styles.quizOption
                        if (selected !== null) {
                            if (opt === current.correct) cls = `${styles.quizOption} ${styles.optCorrect}`
                            else if (opt === selected && selected !== '__timeout__') cls = `${styles.quizOption} ${styles.optWrong}`
                            else cls = `${styles.quizOption} ${styles.optDim}`
                        }
                        return (
                            <motion.button key={i} className={cls}
                                onClick={() => handleSelect(opt)}
                                disabled={selected !== null}
                                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ ...spring, delay: i * 0.06 }}
                                whileTap={selected === null ? { scale: 0.94 } : {}}>
                                {opt}
                            </motion.button>
                        )
                    })}
                </div>

                {/* 오답 피드백 */}
                <AnimatePresence>
                    {quizState === 'wrong' && (
                        <motion.div className={`${styles.glass} ${styles.wrongFeedback}`}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            transition={spring}>
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

    // ── 목록 화면 ──
    if (wrongWords.length === 0 && masteredWords.length === 0) {
        return (
            <motion.div className={`${styles.glass} ${styles.empty}`}
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <BookX size={48} style={{ color: '#94a3b8' }} />
                <p style={{ margin: 0 }}>틀린 단어가 없습니다!</p>
                <small style={{ fontSize: '0.8rem', opacity: 0.6 }}>퀴즈나 배틀에서 틀린 단어가 여기에 표시됩니다.</small>
            </motion.div>
        )
    }

    // 타입 필터 적용된 졸업 단어
    const typeFilteredMastered = masteredWords.filter(e => {
        if (typeFilter === 'word') return e.word.type !== 'idiom'
        if (typeFilter === 'idiom') return e.word.type === 'idiom'
        return true
    })

    // 상태 필터링
    const isGraduatedView = listFilter === 'graduated'
    const filteredWords = isGraduatedView
        ? typeFilteredMastered
        : typeFilteredWrongWords.filter(entry => {
            if (listFilter === 'danger') return entry.wrong_count >= 3
            if (listFilter === 'near_grad') return entry.consecutive_correct >= 2
            return true
        })

    const dangerCount = typeFilteredWrongWords.filter(e => e.wrong_count >= 3).length
    const nearGradCount = typeFilteredWrongWords.filter(e => e.consecutive_correct >= 2).length
    const maxWrongCount = Math.max(...typeFilteredWrongWords.map(e => e.wrong_count), 1)

    return (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* 헤더 */}
            <div className={`${styles.glass}`} style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                            <BookX size={18} style={{ verticalAlign: '-3px', marginRight: '6px', color: '#ef4444' }} />
                            오답 {wrongWords.length}개
                            {wrongWords.some(e => e.word.type === 'idiom') && (
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sub)', marginLeft: '6px' }}>
                                    (단어 {wrongWords.filter(e => e.word.type !== 'idiom').length} / 숙어 {wrongWords.filter(e => e.word.type === 'idiom').length})
                                </span>
                            )}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)', margin: '2px 0 0' }}>
                            3회 연속 정답 시 졸업
                        </p>
                    </div>
                </div>

                {/* 액션 버튼 */}
                <div className={styles.wrongActionsRow}>
                    <motion.button className={styles.revengeBtn} onClick={startRevengeQuiz}
                        whileTap={{ scale: 0.93 }} transition={spring}
                        disabled={wrongWords.length < 4}>
                        <Swords size={16} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                        리벤지 퀴즈
                    </motion.button>
                    <motion.button className={styles.revengeBattleBtn} onClick={createRevengeBattle}
                        whileTap={{ scale: 0.93 }} transition={spring}
                        disabled={wrongWords.length < 4 || creatingBattle}>
                        <Users size={16} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                        {creatingBattle ? '생성 중…' : '리벤지 배틀'}
                    </motion.button>
                </div>
            </div>

            {wrongWords.length < 4 && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-sub)', textAlign: 'center', padding: '0 1rem' }}>
                    오답이 4개 이상일 때 퀴즈와 배틀을 시작할 수 있습니다.
                </p>
            )}

            {/* 타입 필터 (전체 / 단어만 / 숙어만) */}
            <div className={`${styles.glass} ${styles.filterRow}`}>
                {([
                    { key: 'all' as TypeFilter, label: '전체', count: wrongWords.length },
                    { key: 'word' as TypeFilter, label: '📝 단어만', count: wrongWords.filter(e => e.word.type !== 'idiom').length },
                    { key: 'idiom' as TypeFilter, label: '🔗 숙어만', count: wrongWords.filter(e => e.word.type === 'idiom').length },
                ]).map(f => (
                    <motion.button
                        key={f.key}
                        className={`${styles.filterBtn} ${typeFilter === f.key ? styles.filterActive : ''} ${f.key === 'word' && typeFilter === f.key ? styles.filterWord : ''} ${f.key === 'idiom' && typeFilter === f.key ? styles.filterIdiom : ''}`}
                        onClick={() => setTypeFilter(f.key)}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span>{f.label}</span>
                        <span className={styles.filterCount}>{f.count}</span>
                    </motion.button>
                ))}
            </div>

            {/* 상태 필터 탭 */}
            <div className={`${styles.glass} ${styles.filterRow}`}>
                {([
                    { key: 'all' as ListFilter, label: '전체', icon: <List size={14} />, count: typeFilteredWrongWords.length },
                    { key: 'danger' as ListFilter, label: '위험', icon: <AlertTriangle size={14} />, count: dangerCount },
                    { key: 'near_grad' as ListFilter, label: '졸업임박', icon: <GraduationCap size={14} />, count: nearGradCount },
                    { key: 'graduated' as ListFilter, label: '졸업', icon: <CheckCircle2 size={14} />, count: masteredWords.length },
                ]).map(f => (
                    <motion.button
                        key={f.key}
                        className={`${styles.filterBtn} ${listFilter === f.key ? styles.filterActive : ''} ${f.key === 'danger' && listFilter === f.key ? styles.filterDanger : ''} ${f.key === 'near_grad' && listFilter === f.key ? styles.filterGrad : ''} ${f.key === 'graduated' && listFilter === f.key ? styles.filterGraduated : ''}`}
                        onClick={() => setListFilter(f.key)}
                        whileTap={{ scale: 0.95 }}
                    >
                        {f.icon}
                        <span>{f.label}</span>
                        <span className={styles.filterCount}>{f.count}</span>
                    </motion.button>
                ))}
            </div>

            {/* 오답 단어 목록 */}
            <div className={styles.wrongWordsList}>
                <AnimatePresence mode="popLayout">
                    {filteredWords.length === 0 ? (
                        <motion.div key="empty-filter"
                            className={`${styles.glass} ${styles.empty}`}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ padding: '2rem' }}>
                            {listFilter === 'danger' ? '위험 단어가 없습니다.'
                                : listFilter === 'graduated' ? '졸업한 단어가 없습니다.'
                                : '졸업 임박 단어가 없습니다.'}
                        </motion.div>
                    ) : isGraduatedView ? (
                        filteredWords.map((entry, i) => (
                            <motion.div key={entry.id}
                                className={`${styles.glass} ${styles.wrongWordCard}`}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                                style={{
                                    background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.03) 100%)',
                                    borderColor: 'rgba(16,185,129,0.25)',
                                }}>
                                <div className={styles.wrongWordMain}>
                                    <span className={styles.wrongWordText}>{entry.word.word}</span>
                                    <span className={styles.wrongWordMeaning}>
                                        {[entry.word.mean_1, entry.word.mean_2, entry.word.mean_3].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                                <div className={styles.wrongWordMeta}>
                                    <span className={styles.masteredBadge}>
                                        <CheckCircle2 size={12} /> 졸업
                                    </span>
                                    <span className={styles.wrongCountBadge} style={{
                                        background: 'rgba(16,185,129,0.1)',
                                        color: '#059669',
                                    }}>
                                        {entry.wrong_count}회 틀림
                                    </span>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        filteredWords.map((entry, i) => {
                            const heatIntensity = Math.min(entry.wrong_count / maxWrongCount, 1)
                            const heatAlpha = 0.03 + heatIntensity * 0.12

                            return (
                                <motion.div key={entry.id}
                                    className={`${styles.glass} ${styles.wrongWordCard}`}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                                    style={{
                                        background: `linear-gradient(135deg, rgba(239,68,68,${heatAlpha}) 0%, rgba(239,68,68,${heatAlpha * 0.4}) 100%)`,
                                        borderColor: `rgba(239,68,68,${0.08 + heatIntensity * 0.2})`,
                                    }}>
                                    <div className={styles.wrongWordMain}>
                                        <span className={styles.wrongWordText}>{entry.word.word}</span>
                                        <span className={styles.wrongWordMeaning}>
                                            {[entry.word.mean_1, entry.word.mean_2, entry.word.mean_3].filter(Boolean).join(', ')}
                                        </span>
                                    </div>
                                    <div className={styles.wrongWordMeta}>
                                        <span className={styles.wrongCountBadge}
                                            style={{
                                                background: `rgba(239,68,68,${0.06 + heatIntensity * 0.14})`,
                                                color: heatIntensity > 0.6 ? '#b91c1c' : '#ef4444',
                                            }}>
                                            <XCircle size={12} /> {entry.wrong_count}회
                                        </span>
                                        <div className={styles.consecutiveDots}>
                                            {[0, 1, 2].map(j => (
                                                <span key={j}
                                                    className={j < entry.consecutive_correct ? styles.dotFilled : styles.dotEmpty}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
