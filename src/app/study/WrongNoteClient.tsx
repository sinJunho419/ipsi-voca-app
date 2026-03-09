'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Word } from '@/types/vocabulary'
import styles from './study.module.css'

interface WrongAnswer {
    id: number
    word_id: number
    wrong_count: number
    last_wrong_at: string
    word: Word
}

const spring: Transition = { type: 'spring', stiffness: 420, damping: 30 }

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

export default function WrongNoteClient({ onCloseAction }: { onCloseAction: () => void }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [wrongList, setWrongList] = useState<WrongAnswer[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)

    const fetchWrongAnswers = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setLoading(false)
            return
        }

        const { data, error } = await supabase
            .from('wrong_answers')
            .select('*, word:words(*)')
            .eq('user_id', user.id)
            .order('last_wrong_at', { ascending: false })

        if (error) {
            console.error('Error fetching wrong answers:', error)
        } else {
            setWrongList(data as any[] || [])
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchWrongAnswers()
    }, [fetchWrongAnswers])

    const handleDelete = async (waId: number) => {
        if (!confirm('이 단어를 오답노트에서 삭제하시겠습니까?')) return

        const { error } = await supabase
            .from('wrong_answers')
            .delete()
            .eq('id', waId)

        if (!error) {
            setWrongList(prev => {
                const newList = prev.filter(item => item.id !== waId)
                if (currentIndex >= newList.length && currentIndex > 0) {
                    setCurrentIndex(newList.length - 1)
                }
                return newList
            })
            setIsFlipped(false)
        }
    }

    if (loading) return <div className={`${styles.glass} ${styles.empty}`}>오답노트 로딩 중...</div>

    if (wrongList.length === 0) {
        return (
            <div className={`${styles.glass} ${styles.empty}`}>
                <p>오답노트가 비어 있습니다! 🎉</p>
                <button className={styles.masterCloseBtn} onClick={onCloseAction} style={{ marginTop: '1rem' }}>
                    돌아가기
                </button>
            </div>
        )
    }

    const currentItem = wrongList[currentIndex]
    const currentWord = currentItem.word
    const meanings = [currentWord.mean_1, currentWord.mean_2, currentWord.mean_3].filter(Boolean)
    const progress = ((currentIndex + 1) / wrongList.length) * 100

    return (
        <div className={styles.wrongNoteWrap}>
            <div className={styles.wrongHeader}>
                <span className={styles.challengeTitle}>🚩 오답노트</span>
                <button className={styles.challengeCloseBtn} onClick={onCloseAction}>✕</button>
            </div>

            {/* 진행 바 */}
            <div className={`${styles.glass} ${styles.progressRow}`} style={{ marginTop: '1rem' }}>
                <div className={styles.progressBar}>
                    <motion.div
                        className={styles.progressFill}
                        animate={{ width: `${progress}%` }}
                        style={{ backgroundColor: '#ef4444' }}
                        transition={{ duration: 0.4 }}
                    />
                </div>
                <span className={styles.progressText}>{currentIndex + 1} / {wrongList.length}</span>
            </div>

            {/* 플래시카드 */}
            <motion.div
                key={currentIndex}
                className={styles.cardWrap}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
                style={{ margin: '1.5rem 0' }}
            >
                <div
                    className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}
                    onClick={() => setIsFlipped(v => !v)}
                >
                    {/* 앞면 */}
                    <div className={`${styles.cardFace} ${styles.cardFront}`}>
                        <div className={styles.wrongBadge}>⚠ 틀린 횟수: {currentItem.wrong_count}</div>
                        <span className={styles.wordText}>{currentWord.word}</span>
                        <motion.button
                            className={styles.speakBtn}
                            onClick={e => { e.stopPropagation(); speak(currentWord.word) }}
                            whileTap={{ scale: 0.85 }}
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

            {/* 네비게이션 및 삭제 */}
            <div className={`${styles.glass} ${styles.nav}`}>
                <motion.button
                    className={styles.navBtn}
                    onClick={() => { setCurrentIndex(i => i - 1); setIsFlipped(false) }}
                    disabled={currentIndex === 0}
                    whileTap={{ scale: 0.93 }}
                >← 이전</motion.button>

                <motion.button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(currentItem.id)}
                    whileTap={{ scale: 0.93 }}
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '0.8rem', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 'bold' }}
                >
                    지우기
                </motion.button>

                <motion.button
                    className={styles.navBtn}
                    onClick={() => { setCurrentIndex(i => i + 1); setIsFlipped(false) }}
                    disabled={currentIndex === wrongList.length - 1}
                    whileTap={{ scale: 0.93 }}
                >다음 →</motion.button>
            </div>

            <p className={styles.hint} style={{ color: '#ef4444' }}>
                완벽히 외운 단어는 &apos;지우기&apos; 버튼을 눌러 삭제하세요.
            </p>
        </div>
    )
}
