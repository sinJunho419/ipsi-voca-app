'use client'

import { useEffect, useState } from 'react'

/**
 * 카카오톡 인앱 브라우저 감지 → 외부 브라우저로 전환
 * - Android: intent:// 스킴으로 Chrome 자동 실행
 * - iOS: 안내 배너 표시 (Safari 자동 전환 불가)
 */
export default function KakaoRedirect() {
    const [showBanner, setShowBanner] = useState(false)

    useEffect(() => {
        const ua = navigator.userAgent
        const isKakao = /KAKAOTALK/i.test(ua)
        if (!isKakao) return

        const isAndroid = /Android/i.test(ua)
        const currentUrl = window.location.href

        if (isAndroid) {
            // Android: Chrome으로 자동 전환
            const intentUrl =
                'intent://' +
                currentUrl.replace(/^https?:\/\//, '') +
                '#Intent;scheme=https;package=com.android.chrome;end'
            window.location.href = intentUrl
        } else {
            // iOS: 안내 배너 표시
            setShowBanner(true)
        }
    }, [])

    if (!showBanner) return null

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
            color: '#fff',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '14px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}>
            <span style={{ flex: 1 }}>
                음성 기능을 사용하려면 Safari에서 열어주세요
            </span>
            <button
                onClick={() => {
                    // iOS Safari로 열기 시도
                    window.open(window.location.href, '_blank')
                }}
                style={{
                    background: '#fff',
                    color: '#1e3a5f',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                }}
            >
                Safari로 열기
            </button>
            <button
                onClick={() => setShowBanner(false)}
                style={{
                    background: 'transparent',
                    color: '#fff',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '0 4px',
                    opacity: 0.7,
                }}
                aria-label="닫기"
            >
                ✕
            </button>
        </div>
    )
}
