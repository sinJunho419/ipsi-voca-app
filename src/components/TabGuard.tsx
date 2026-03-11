'use client'

import { useEffect, useState } from 'react'

export default function TabGuard() {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const tabId = Math.random().toString(36).slice(2)
    const channel = new BroadcastChannel('ipsivoca-tab')

    // 새 탭이 열렸음을 기존 탭들에게 알림
    channel.postMessage({ type: 'new-tab', tabId })

    // 다른 탭에서 "new-tab" 메시지를 받으면 이 탭은 비활성화
    channel.onmessage = (e) => {
      if (e.data.type === 'new-tab' && e.data.tabId !== tabId) {
        setBlocked(true)
      }
    }

    return () => channel.close()
  }, [])

  if (!blocked) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      color: '#fff',
      fontFamily: 'Pretendard, sans-serif',
    }}>
      <div style={{ fontSize: '48px' }}>⚠️</div>
      <div style={{ fontSize: '18px', fontWeight: 700 }}>
        다른 창에서 입시보카가 열렸습니다
      </div>
      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
        이 창은 더 이상 사용할 수 없습니다
      </div>
      <button
        onClick={() => window.close()}
        style={{
          marginTop: '8px',
          padding: '10px 28px',
          borderRadius: '8px',
          border: 'none',
          background: '#6C63FF',
          color: '#fff',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        이 창 닫기
      </button>
    </div>
  )
}
