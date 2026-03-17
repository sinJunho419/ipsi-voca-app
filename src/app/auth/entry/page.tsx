'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function EntryForm() {
    const params = useSearchParams()
    const [status, setStatus] = useState('인증 확인 중...')

    useEffect(() => {
        const payload = params.get('p')
        if (!payload) {
            setStatus('인증 정보가 없습니다.')
            return
        }

        // payload를 localStorage에 저장하고 URL에서 제거
        localStorage.setItem('auth_payload', payload)
        window.location.replace('/auth/loading')
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
                    {status}
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
