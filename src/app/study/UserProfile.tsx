'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Level } from '@/types/vocabulary'
import { getTierInfo } from '@/lib/tierSystem'
import styles from './study.module.css'

// ── 레벨별 총 세트 수 (공식 목표치) ──────────────────────────────
// 숙련도 = (해당 레벨의 success_count 합계) / (총 세트 수 × 3) × 100
const TOTAL_SETS: Record<Level, number> = {
    elem_3: 16,
    elem_4: 16,
    elem_5: 16,
    elem_6: 16,
    mid_1: 16,
    mid_2: 16,
    mid_3: 16,
    high_1: 16,
    high_2: 16,
}

/**
 * 숙련도 점수 계산:
 * (현재 레벨의 success_count 합계) ÷ (총 세트 수 × 3) × 100
 */
function calcMastery(totalSuccess: number, level: Level): number {
    const maxScore = TOTAL_SETS[level] * 3
    if (maxScore === 0) return 0
    return Math.min(Math.round((totalSuccess / maxScore) * 100), 100)
}

interface ProfileData {
    masteryScore: number   // 숙련도 점수 (0~100)
    clearedCount: number   // 클리어한 세트 수
    medalCount: number     // 훈장 수 (= 3회 모두 성공한 세트)
    totalSuccess: number   // 총 성공 횟수 (디버깅/표시용)
}

interface Props {
    level: Level | ''
    /** 퀴즈 완료 후 외부에서 새로고침 트리거 */
    refreshKey?: number
}

export default function UserProfile({ level, refreshKey }: Props) {
    const supabase = createClient()
    const [profile, setProfile] = useState<ProfileData | null>(null)

    useEffect(() => {
        if (!level) return
        let cancelled = false

        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || cancelled) return

            const { data, error } = await supabase
                .from('user_progress')
                .select('success_count, is_cleared, has_medal')
                .eq('user_id', user.id)
                .eq('level', level)

            if (error || !data || cancelled) return

            const totalSuccess = data.reduce((sum, r) => sum + (r.success_count ?? 0), 0)
            const clearedCount = data.filter(r => r.is_cleared).length
            // 훈장: has_medal 컬럼이 있으면 그걸로, 없으면 success_count≥3으로 fallback
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const medalCount = data.filter(r => (r as any).has_medal ?? (r.success_count >= 3)).length
            const masteryScore = calcMastery(totalSuccess, level)

            setProfile({ masteryScore, clearedCount, medalCount, totalSuccess })
        }

        load()
        return () => { cancelled = true }
    }, [level, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!level) return null

    if (!profile) {
        return (
            <motion.div
                className={styles.profileCard}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ justifyContent: 'center', background: 'rgba(255, 255, 255, 0.4)' }}
            >
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    💡 로그인이 안 되어 있습니다. (진도가 저장되지 않음)
                </span>
            </motion.div>
        )
    }

    const { alias, label: tier, color, bg } = getTierInfo(level)

    return (
        <motion.div
            className={styles.profileCard}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            key={level}
        >
            {/* 왼쪽: 별칭 + 티어 */}
            <div className={styles.profileLeft}>
                <span className={styles.profileAlias}>{alias}</span>
                <span
                    className={styles.profileTier}
                    style={{ color, background: bg }}
                >
                    {tier}
                </span>
            </div>

            {/* 가운데: 숙련도 점수 */}
            <div className={styles.profileMastery}>
                <span className={styles.profileMasteryNum} style={{ color }}>
                    {profile.masteryScore}
                </span>
                <span className={styles.profileMasteryLabel}>숙련도</span>
                {/* 숙련도 바 */}
                <div className={styles.profileMasteryBar}>
                    <motion.div
                        className={styles.profileMasteryFill}
                        animate={{ width: `${profile.masteryScore}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
                    />
                </div>
            </div>

            {/* 오른쪽: 클리어 + 훈장 */}
            <div className={styles.profileStats}>
                <div className={styles.profileStatItem}>
                    <span className={styles.profileStatNum}>{profile.clearedCount}</span>
                    <span className={styles.profileStatLabel}>클리어</span>
                </div>
                <div className={styles.profileStatDivider} />
                <div className={styles.profileStatItem}>
                    <span className={styles.profileStatNum} style={{ color: '#d97706' }}>
                        {profile.medalCount}
                    </span>
                    <span className={styles.profileStatLabel}>훈장</span>
                </div>
            </div>
        </motion.div>
    )
}
