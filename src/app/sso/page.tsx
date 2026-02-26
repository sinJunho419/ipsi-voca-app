'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './sso.module.css'

/** useSearchParams는 반드시 Suspense 안에서 사용해야 합니다 */
function SsoRedirector() {
    const params = useSearchParams()

    useEffect(() => {
        const userId = params.get('user_id')
        const ts = params.get('ts')
        const token = params.get('token')

        if (!userId || !ts || !token) return

        // 로딩 화면을 1.2초 보여준 뒤 SSO API로 이동
        const timer = setTimeout(() => {
            const url = new URL('/api/auth/sso', window.location.origin)
            url.searchParams.set('user_id', userId)
            url.searchParams.set('ts', ts)
            url.searchParams.set('token', token)
            window.location.href = url.toString()
        }, 1200)

        return () => clearTimeout(timer)
    }, [params])

    return null
}

/**
 * 입시내비 SSO 로딩 화면
 * 입시내비 서버에서 /sso?user_id=...&ts=...&token=... 로 리다이렉트하면
 * 이 인증 화면을 보여준 후 /api/auth/sso → Supabase 세션 → /study 로 이동합니다.
 */
export default function SsoPage() {
    return (
        <div className={styles.page}>
            <Suspense>
                <SsoRedirector />
            </Suspense>

            {/* 움직이는 파스텔 블롭 */}
            <div className={styles.blob1} />
            <div className={styles.blob2} />
            <div className={styles.blob3} />

            {/* 중앙 글래스 카드 */}
            <div className={styles.card}>
                <div className={styles.iconWrap}>
                    <span className={styles.icon}>🔐</span>
                </div>

                <h1 className={styles.title}>입시내비 인증 중</h1>
                <p className={styles.subtitle}>잠시만 기다려 주세요</p>

                <div className={styles.dots}>
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                </div>

                <div className={styles.bar}>
                    <div className={styles.barFill} />
                </div>
            </div>
        </div>
    )
}
