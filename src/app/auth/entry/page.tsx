'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

function EntryForm() {
    const params = useSearchParams()
    const submitted = useRef(false)

    useEffect(() => {
        if (submitted.current) return
        submitted.current = true

        const payload = params.get('p')
        if (!payload) {
            alert('인증 정보가 없습니다.')
            history.back()
            return
        }

        fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload }),
            credentials: 'same-origin',
        })
            .then(async res => {
                const data = await res.json()
                if (data.ok && data.redirectUrl) {
                    window.location.replace(data.redirectUrl)
                } else {
                    alert(data.message || '인증에 실패했습니다.')
                    history.back()
                }
            })
            .catch(() => {
                alert('네트워크 오류가 발생했습니다.')
                history.back()
            })
    }, [params])

    return (
        <div style={{
            margin: 0, minHeight: '100vh', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
            fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
            color: '#fff',
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    fontSize: '4rem', fontWeight: 800,
                    background: 'linear-gradient(135deg,#6C63FF,#a78bfa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>입시보카</div>
                <div style={{ marginTop: '1.5rem', fontSize: '1.2rem', color: '#c4b5fd' }}>
                    인증 확인 중...
                </div>
            </div>
        </div>
    )
}

export default function AuthEntryPage() {
    return (
        <Suspense>
            <EntryForm />
        </Suspense>
    )
}
