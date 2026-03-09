import { useState, useEffect, useRef } from 'react'
import styles from './study.module.css'

interface Props {
    onTimeout: () => void
    resetTrigger: number    // 문제가 바뀔 때마다 증가 → 타이머 리셋
    stopped: boolean        // 정답 선택 시 true → 타이머 즉시 중단
    totalTimeSec?: number   // 기본 4초 (마스터 챌린지는 10초)
    accentColor?: string    // 고정 색상 (없으면 진행에 따라 녹/황/적)
}

export default function QuizTimerBar({
    onTimeout,
    resetTrigger,
    stopped,
    totalTimeSec = 4,
    accentColor,
}: Props) {
    const [progress, setProgress] = useState(100)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        setProgress(100)
        const expiredRef = { current: false }

        const totalTime = totalTimeSec * 1000
        const intervalTime = 10
        const step = (intervalTime / totalTime) * 100

        timerRef.current = setInterval(() => {
            setProgress((prev) => {
                const next = prev - step
                if (next <= 0) {
                    if (timerRef.current) clearInterval(timerRef.current)
                    if (!expiredRef.current) {
                        expiredRef.current = true
                        setTimeout(onTimeout, 0)
                    }
                    return 0
                }
                return next
            })
        }, intervalTime)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [resetTrigger, totalTimeSec]) // eslint-disable-line react-hooks/exhaustive-deps

    // 정답 클릭 시 타이머 즉시 중단
    useEffect(() => {
        if (stopped && timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [stopped])

    // accentColor가 있으면 고정, 없으면 진행률 기반 3색
    const barColor = accentColor
        ? accentColor
        : progress > 50 ? '#4ade80' : progress > 25 ? '#facc15' : '#ef4444'

    return (
        <div className={styles.timerBarTrack}>
            <div
                className={styles.timerBarFill}
                style={{ width: `${progress}%`, backgroundColor: barColor }}
            />
        </div>
    )
}
