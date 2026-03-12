'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

const IPSI_NAVI_URL = 'https://ipsinavi.com'

function LoadingContent() {
    const searchParams = useSearchParams()
    const payload = searchParams.get('payload')
    const name = searchParams.get('name')
    const error = searchParams.get('error')
    const redirect = searchParams.get('redirect') || IPSI_NAVI_URL
    const [status, setStatus] = useState('로그인 처리 중')

    useEffect(() => {
        if (error) {
            alert(error)
            window.location.href = redirect
            return
        }

        if (!payload) {
            alert('비정상 접근입니다.')
            window.location.href = IPSI_NAVI_URL
            return
        }

        async function createSession() {
            try {
                const res = await fetch('/api/auth/verify/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payload }),
                    credentials: 'same-origin',
                })
                const data = await res.json()
                if (data.ok) {
                    setStatus('로그인 완료!')
                    window.location.href = '/study'
                } else {
                    alert(data.error || '로그인에 실패했습니다.')
                    window.location.href = IPSI_NAVI_URL
                }
            } catch {
                alert('로그인 처리 중 오류가 발생했습니다.')
                window.location.href = IPSI_NAVI_URL
            }
        }

        createSession()
    }, [payload, error, redirect])

    // 에러 시에는 아무것도 표시하지 않음 (alert 후 즉시 redirect)
    if (error || !payload) return null

    return (
        <>
            <div className="bg-orb orb1" />
            <div className="bg-orb orb2" />
            <div className="container">
                <div className="logo">입시보카</div>
                <div className="greeting">{name}님, 환영합니다!</div>
                <div className="spinner-wrap"><div className="spinner" /></div>
                <div className="status">{status}<span className="dots" /></div>
            </div>
            <style jsx>{`
                * { margin: 0; padding: 0; box-sizing: border-box; }
                .container {
                    text-align: center;
                    z-index: 1;
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .logo {
                    font-size: 2.2rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, #6C63FF, #a78bfa);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 1.5rem;
                }
                .greeting {
                    font-size: 1.1rem;
                    color: #c4b5fd;
                    margin-bottom: 2rem;
                }
                .spinner-wrap {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 1.5rem;
                }
                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 4px solid rgba(108, 99, 255, 0.2);
                    border-top-color: #6C63FF;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .status {
                    font-size: 0.95rem;
                    color: #94a3b8;
                }
                .dots::after {
                    content: '';
                    animation: dots 1.5s steps(4, end) infinite;
                }
                @keyframes dots {
                    0%   { content: ''; }
                    25%  { content: '.'; }
                    50%  { content: '..'; }
                    75%  { content: '...'; }
                }
                .bg-orb {
                    position: fixed;
                    border-radius: 50%;
                    filter: blur(80px);
                    opacity: 0.3;
                    animation: float 6s ease-in-out infinite;
                }
                .orb1 {
                    width: 300px; height: 300px;
                    background: #6C63FF;
                    top: -100px; left: -100px;
                }
                .orb2 {
                    width: 250px; height: 250px;
                    background: #a78bfa;
                    bottom: -80px; right: -80px;
                    animation-delay: 3s;
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(20px); }
                }
            `}</style>
        </>
    )
}

export default function AuthLoadingPage() {
    return (
        <Suspense>
            <LoadingContent />
        </Suspense>
    )
}
