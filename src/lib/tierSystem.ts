import type { Level } from '@/types/vocabulary'

export interface TierInfo {
    label: string    // 티어 이름 (영문)
    labelKo: string  // 티어 이름 (한국어)
    alias: string    // 학년 별칭 (초3, 중1 등)
    color: string    // 메인 색상
    bg: string       // 배지 배경
    cssVar: string   // CSS 변수 이름
}

const TIER_MAP: Record<Level, TierInfo> = {
    elem_3: { label: 'Starter',      labelKo: '스타터',       alias: '초3', color: '#4ade80', bg: 'rgba(74,222,128,0.15)',   cssVar: '--tier-starter' },
    elem_4: { label: 'Rookie',       labelKo: '루키',         alias: '초4', color: '#2dd4bf', bg: 'rgba(45,212,191,0.15)',   cssVar: '--tier-rookie' },
    elem_5: { label: 'Bronze',       labelKo: '브론즈',       alias: '초5', color: '#d4915c', bg: 'rgba(212,145,92,0.15)',   cssVar: '--tier-bronze' },
    elem_6: { label: 'Silver',       labelKo: '실버',         alias: '초6', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)',  cssVar: '--tier-silver' },
    mid_1:  { label: 'Gold',         labelKo: '골드',         alias: '중1', color: '#facc15', bg: 'rgba(250,204,21,0.15)',   cssVar: '--tier-gold' },
    mid_2:  { label: 'Platinum',     labelKo: '플래티넘',     alias: '중2', color: '#22d3ee', bg: 'rgba(34,211,238,0.15)',   cssVar: '--tier-platinum' },
    mid_3:  { label: 'Diamond',      labelKo: '다이아몬드',   alias: '중3', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',   cssVar: '--tier-diamond' },
    high_1: { label: 'Challenger',   labelKo: '챌린저',       alias: '고1', color: '#f87171', bg: 'rgba(248,113,113,0.15)',  cssVar: '--tier-challenger' },
    high_2: { label: 'GrandMaster',  labelKo: '그랜드마스터', alias: '고2', color: '#f59e0b', bg: 'linear-gradient(135deg,rgba(234,179,8,0.2),rgba(180,83,9,0.2))', cssVar: '--tier-grandmaster' },
}

/** level 값으로 티어 정보 반환 */
export function getTierInfo(level: Level): TierInfo {
    return TIER_MAP[level]
}

/** level 값으로 티어 영문 라벨 반환 */
export function getTierLabel(level: Level): string {
    return TIER_MAP[level].label
}

/** level 값으로 티어 색상 반환 */
export function getTierColor(level: Level): string {
    return TIER_MAP[level].color
}

/** 전체 레벨 목록 (셀렉트 옵션용) - 티어 이름 포함 */
export const TIER_LEVELS: { value: Level; label: string }[] = [
    { value: 'elem_3', label: 'Starter' },
    { value: 'elem_4', label: 'Rookie' },
    { value: 'elem_5', label: 'Bronze' },
    { value: 'elem_6', label: 'Silver' },
    { value: 'mid_1',  label: 'Gold' },
    { value: 'mid_2',  label: 'Platinum' },
    { value: 'mid_3',  label: 'Diamond' },
    { value: 'high_1', label: 'Challenger' },
    { value: 'high_2', label: 'GrandMaster' },
]
