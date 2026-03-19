'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
    BarChart3, Trophy, Swords, BookCheck, BookOpen, ClipboardCheck,
    ChevronLeft, ChevronRight, ArrowLeft, Users, Target
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie,
} from 'recharts'
import styles from './report.module.css'

interface ReportData {
    studyCount: number
    quizCount: number
    totalBattles: number
    wins: number
    winRate: number
    masteredWordCount: number
    masteredIdiomCount: number
    topRivalId: number | null
    topRivalName: string | null
    topRivalCount: number
    dailyActivity: { day: string; count: number }[]
    totalActivity: number
}

interface AcademyAvg {
    avgBattles: number
    avgWinRate: number
    avgMastered: number
    avgStudy: number
    avgQuiz: number
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const DAY_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#6366f1', '#818cf8', '#f472b6', '#f472b6']
const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function getWeekStart(offset: number): Date {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() + mondayOffset)
    thisMonday.setHours(0, 0, 0, 0)
    const weekStart = new Date(thisMonday)
    weekStart.setDate(thisMonday.getDate() + (offset * 7))
    return weekStart
}

function formatWeekRange(weekStart: Date): string {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const m1 = weekStart.getMonth() + 1
    const d1 = weekStart.getDate()
    const w1 = WEEKDAY_NAMES[weekStart.getDay()]
    const m2 = weekEnd.getMonth() + 1
    const d2 = weekEnd.getDate()
    const w2 = WEEKDAY_NAMES[weekEnd.getDay()]
    return `${m1}/${d1}(${w1}) ~ ${m2}/${d2}(${w2})`
}

const cardVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0, rotateY: dir > 0 ? 15 : -15 }),
    center: { x: 0, opacity: 1, rotateY: 0 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0, rotateY: dir > 0 ? -15 : 15 }),
}

export default function ReportClient() {
    const supabase = createClient()
    const router = useRouter()

    const [isLoading, setIsLoading] = useState(true)
    const [userId, setUserId] = useState<number | null>(null)
    const [report, setReport] = useState<ReportData | null>(null)
    const [academyAvg, setAcademyAvg] = useState<AcademyAvg | null>(null)
    const [userName, setUserName] = useState('')
    const [weekOffset, setWeekOffset] = useState(0)

    // 카드 캐러셀
    const [cardIndex, setCardIndex] = useState(0)
    const [direction, setDirection] = useState(0)
    const touchStartX = useRef(0)

    const weekStart = getWeekStart(weekOffset)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    useEffect(() => {
        async function load() {
            setIsLoading(true)

            // 인증 확인
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setIsLoading(false); return }
            const loginInfoId = user.user_metadata?.login_info_id as number
            if (!loginInfoId) { setIsLoading(false); return }
            setUserId(loginInfoId)

            // API 경유로 모든 데이터 조회 (RLS 우회)
            try {
                const res = await fetch('/api/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'weekly',
                        weekStart: weekStart.toISOString(),
                        weekEnd: weekEnd.toISOString(),
                    }),
                    cache: 'no-store',
                })

                if (!res.ok) { setIsLoading(false); return }
                const data = await res.json()

                setUserName(data.userName)
                setReport(data.report)
                if (data.academyAvg) setAcademyAvg(data.academyAvg)
            } catch {
                // 네트워크 에러
            }

            setIsLoading(false)
        }
        load()
    }, [weekOffset]) // eslint-disable-line react-hooks/exhaustive-deps

    function navigate(dir: number) {
        setDirection(dir)
        setCardIndex(prev => prev + dir)
    }

    if (isLoading) {
        return (
            <div className={styles.page}>
                <div className={styles.loader}>리포트 생성 중…</div>
            </div>
        )
    }

    if (!userId || !report) {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <p style={{ textAlign: 'center', color: '#64748b' }}>
                        로그인이 필요하거나 데이터가 없습니다.
                    </p>
                    <button className={styles.backBtn} onClick={() => router.push('/study')}>
                        <ArrowLeft size={14} /> 학습으로 돌아가기
                    </button>
                </div>
            </div>
        )
    }

    // 학원 비교 문구 (총 활동 기준)
    function getComparisonMsg() {
        if (!academyAvg || !report) return null

        const myTotal = report.totalActivity
        const avgTotal = (academyAvg.avgStudy + academyAvg.avgQuiz + academyAvg.avgBattles)
        const pct = avgTotal > 0
            ? Math.round(((myTotal - avgTotal) / avgTotal) * 100)
            : 0

        if (pct > 0) {
            return { text: `우리 학원 평균보다 ${pct}% 더 공부했어요!`, emoji: '🔥', positive: true }
        } else if (pct === 0) {
            return { text: '학원 평균과 동일한 학습량이에요!', emoji: '👍', positive: true }
        } else {
            return { text: `학원 평균보다 ${Math.abs(pct)}% 부족해요. 더 분발해봐요!`, emoji: '💪', positive: false }
        }
    }

    const comparison = getComparisonMsg()

    // 카드 콘텐츠 목록
    const cards = [
        // 0: 요약 카드
        <div key="summary" className={styles.cardInner}>
            <h2 className={styles.cardTitle}>
                <BarChart3 size={22} /> 이번 주 요약
            </h2>
            <div className={styles.statGrid}>
                <div className={styles.statBox}>
                    <BookOpen size={20} className={styles.statIcon} />
                    <span className={styles.statValue}>{report.studyCount}</span>
                    <span className={styles.statLabel}>학습</span>
                </div>
                <div className={styles.statBox}>
                    <ClipboardCheck size={20} className={styles.statIconGold} />
                    <span className={styles.statValue}>{report.quizCount}</span>
                    <span className={styles.statLabel}>테스트</span>
                </div>
                <div className={styles.statBox}>
                    <Swords size={20} className={styles.statIconOrange} />
                    <span className={styles.statValue}>{report.totalBattles}</span>
                    <span className={styles.statLabel}>배틀</span>
                </div>
                <div className={styles.statBox}>
                    <Trophy size={20} className={styles.statIconGold} />
                    <span className={styles.statValue}>{report.winRate}%</span>
                    <span className={styles.statLabel}>승률</span>
                </div>
                <div className={styles.statBox}>
                    <BookCheck size={20} className={styles.statIconGreen} />
                    <span className={styles.statValue}>{report.masteredWordCount}</span>
                    <span className={styles.statLabel}>정복 단어</span>
                </div>
                <div className={styles.statBox}>
                    <span style={{ fontSize: '1.2rem' }}>🔗</span>
                    <span className={styles.statValue}>{report.masteredIdiomCount}</span>
                    <span className={styles.statLabel}>정복 숙어</span>
                </div>
            </div>
        </div>,

        // 1: 요일별 활동 차트
        <div key="chart" className={styles.cardInner}>
            <h2 className={styles.cardTitle}>
                <BarChart3 size={22} /> 요일별 활동
            </h2>
            <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={report.dailyActivity} barCategoryGap="20%">
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }}
                        />
                        <YAxis
                            allowDecimals={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            width={28}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                            contentStyle={{
                                background: 'rgba(255,255,255,0.95)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: '12px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                            }}
                            formatter={(value) => [`${value}회`, '활동']}
                        />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={40}>
                            {report.dailyActivity.map((_, i) => (
                                <Cell key={i} fill={DAY_COLORS[i]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>,

        // 2: 배틀 승률 도넛 차트
        <div key="winrate" className={styles.cardInner}>
            <h2 className={styles.cardTitle}>
                <Trophy size={22} /> 배틀 승률
            </h2>
            <div className={styles.winRateWrap}>
                <div className={styles.donutWrap}>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={[
                                    { name: '승리', value: report.wins || 0 },
                                    { name: '패배', value: Math.max((report.totalBattles - report.wins), 0) || 0 },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={78}
                                startAngle={90}
                                endAngle={-270}
                                dataKey="value"
                                stroke="none"
                            >
                                <Cell fill="#6366f1" />
                                <Cell fill="rgba(99,102,241,0.15)" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className={styles.donutCenter}>
                        <span className={styles.donutValue}>{report.winRate}%</span>
                        <span className={styles.donutLabel}>승률</span>
                    </div>
                </div>
                <div className={styles.winRateStats}>
                    <div className={styles.winRateStat}>
                        <span className={styles.winRateDot} style={{ background: '#6366f1' }} />
                        <span className={styles.winRateStatLabel}>승리</span>
                        <span className={styles.winRateStatValue}>{report.wins}회</span>
                    </div>
                    <div className={styles.winRateStat}>
                        <span className={styles.winRateDot} style={{ background: 'rgba(99,102,241,0.2)' }} />
                        <span className={styles.winRateStatLabel}>패배</span>
                        <span className={styles.winRateStatValue}>{report.totalBattles - report.wins}회</span>
                    </div>
                    <div className={styles.winRateStat}>
                        <span className={styles.winRateDot} style={{ background: '#10b981' }} />
                        <span className={styles.winRateStatLabel}>총 배틀</span>
                        <span className={styles.winRateStatValue}>{report.totalBattles}회</span>
                    </div>
                </div>
            </div>
        </div>,

        // 3: 라이벌 & 성과
        <div key="rival" className={styles.cardInner}>
            <h2 className={styles.cardTitle}>
                <Target size={22} /> 라이벌 & 성과
            </h2>
            {report.topRivalName ? (
                <div className={styles.rivalBox}>
                    <div className={styles.rivalAvatar}>
                        <Swords size={24} />
                    </div>
                    <div>
                        <p className={styles.rivalName}>{report.topRivalName}</p>
                        <p className={styles.rivalSub}>이번 주 {report.topRivalCount}회 대전</p>
                    </div>
                    <span className={styles.rivalBadge}>최다 라이벌</span>
                </div>
            ) : (
                <div className={styles.emptyRival}>
                    <p>이번 주 대전 상대가 없습니다</p>
                    <small>배틀에 참여해보세요!</small>
                </div>
            )}
            <div className={styles.achievementRow}>
                <div className={styles.achieveBox}>
                    <Trophy size={28} style={{ color: '#eab308' }} />
                    <span className={styles.achieveValue}>{report.wins}승</span>
                    <span className={styles.achieveLabel}>이번 주 승리</span>
                </div>
                <div className={styles.achieveBox}>
                    <BookCheck size={28} style={{ color: '#10b981' }} />
                    <span className={styles.achieveValue}>{report.masteredWordCount}개</span>
                    <span className={styles.achieveLabel}>정복 단어</span>
                </div>
                <div className={styles.achieveBox}>
                    <span style={{ fontSize: '1.6rem' }}>🔗</span>
                    <span className={styles.achieveValue}>{report.masteredIdiomCount}개</span>
                    <span className={styles.achieveLabel}>정복 숙어</span>
                </div>
            </div>
        </div>,

        // 4: 학원 비교
        <div key="academy" className={styles.cardInner}>
            <h2 className={styles.cardTitle}>
                <Users size={22} /> 학원 비교
            </h2>
            {comparison ? (
                <>
                    <div className={`${styles.comparisonBanner} ${comparison.positive ? styles.compPositive : styles.compNegative}`}>
                        <span className={styles.compEmoji}>{comparison.emoji}</span>
                        <p className={styles.compText}>{comparison.text}</p>
                    </div>
                    <div className={styles.compGrid}>
                        <CompareBar label="학습" mine={report.studyCount} avg={academyAvg!.avgStudy} />
                        <CompareBar label="테스트" mine={report.quizCount} avg={academyAvg!.avgQuiz} />
                        <CompareBar label="배틀" mine={report.totalBattles} avg={academyAvg!.avgBattles} />
                        <CompareBar label="정복 단어" mine={report.masteredWordCount + report.masteredIdiomCount} avg={academyAvg!.avgMastered} />
                    </div>
                </>
            ) : (
                <div className={styles.emptyRival}>
                    <p>학원 비교 데이터가 없습니다</p>
                    <small>같은 학원의 다른 학생이 활동하면 비교할 수 있어요</small>
                </div>
            )}
        </div>,
    ]

    const totalCards = cards.length
    const safeIndex = Math.max(0, Math.min(cardIndex, totalCards - 1))

    return (
        <div className={styles.page}>
            <div className={styles.blob1} />
            <div className={styles.blob2} />

            {/* 헤더 */}
            <motion.div className={styles.header}
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className={styles.pageTitle}>주간 리포트</h1>
            </motion.div>

            {/* 주간 탐색 */}
            <div className={styles.weekNav}>
                <button
                    className={styles.weekNavBtn}
                    onClick={() => setWeekOffset(w => w - 1)}
                >
                    <ChevronLeft size={18} />
                </button>
                <span className={styles.weekNavLabel}>{formatWeekRange(weekStart)}</span>
                <button
                    className={styles.weekNavBtn}
                    onClick={() => setWeekOffset(w => w + 1)}
                    disabled={weekOffset >= 0}
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* 카드 캐러셀 */}
            <div
                className={styles.carousel}
                onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
                onTouchEnd={e => {
                    const dx = e.changedTouches[0].clientX - touchStartX.current
                    if (Math.abs(dx) > 50) {
                        if (dx < 0 && safeIndex < totalCards - 1) navigate(1)
                        else if (dx > 0 && safeIndex > 0) navigate(-1)
                    }
                }}
            >
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={safeIndex}
                        className={styles.card}
                        custom={direction}
                        variants={cardVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                        {cards[safeIndex]}
                    </motion.div>
                </AnimatePresence>

                {/* 네비게이션 */}
                <div className={styles.carouselNav}>
                    <button
                        className={styles.navBtn}
                        onClick={() => navigate(-1)}
                        disabled={safeIndex === 0}
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className={styles.dots}>
                        {cards.map((_, i) => (
                            <span key={i}
                                className={`${styles.dot} ${i === safeIndex ? styles.dotActive : ''}`}
                                onClick={() => { setDirection(i > safeIndex ? 1 : -1); setCardIndex(i) }}
                            />
                        ))}
                    </div>

                    <button
                        className={styles.navBtn}
                        onClick={() => navigate(1)}
                        disabled={safeIndex === totalCards - 1}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* 하단 돌아가기 */}
            <button className={styles.backBtnBottom} onClick={() => router.push('/study')}>
                <ArrowLeft size={16} /> 돌아가기
            </button>
        </div>
    )
}

// 비교 막대 컴포넌트
function CompareBar({ label, mine, avg, suffix = '' }: {
    label: string; mine: number; avg: number; suffix?: string
}) {
    const max = Math.max(mine, avg, 1)
    const myPct = (mine / max) * 100
    const avgPct = (avg / max) * 100

    return (
        <div className={styles.compareItem}>
            <span className={styles.compareLabel}>{label}</span>
            <div className={styles.compareBars}>
                <div className={styles.compareBarWrap}>
                    <motion.div
                        className={styles.compareBarMine}
                        initial={{ width: 0 }}
                        animate={{ width: `${myPct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                    <span className={styles.compareVal}>{mine}{suffix}</span>
                </div>
                <div className={styles.compareBarWrap}>
                    <motion.div
                        className={styles.compareBarAvg}
                        initial={{ width: 0 }}
                        animate={{ width: `${avgPct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                    />
                    <span className={styles.compareVal}>{avg}{suffix}</span>
                </div>
            </div>
            <div className={styles.compareLegend}>
                <span><span className={styles.legendDotMine} /> 나</span>
                <span><span className={styles.legendDotAvg} /> 학원 평균</span>
            </div>
        </div>
    )
}
