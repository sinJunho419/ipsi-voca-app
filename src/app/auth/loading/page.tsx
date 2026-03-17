'use client'

import { useEffect, useState, Suspense } from 'react'

function LoadingContent() {
    const [status, setStatus] = useState('로그인 처리 중')
    const [showUI, setShowUI] = useState(false)

    useEffect(() => {
        // sessionStorage에서 payload 꺼내고 즉시 삭제
        const payload = sessionStorage.getItem('auth_payload')
        sessionStorage.removeItem('auth_payload')

        if (!payload) {
            alert('잘못된 접근입니다.')
            window.close()
            // window.close() 불가 환경 대비
            setStatus('잘못된 접근입니다. 이 창을 닫아주세요.')
            return
        }

        setShowUI(true)

        async function verify() {
            try {
                const res = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payload }),
                    credentials: 'same-origin',
                })

                const text = await res.text()
                let data
                try {
                    data = JSON.parse(text)
                } catch {
                    setStatus(`응답 파싱 실패`)
                    return
                }

                if (data.ok && data.redirectUrl) {
                    setStatus('로그인 완료!')
                    window.location.replace(data.redirectUrl)
                } else {
                    setStatus(data.message || '인증에 실패했습니다.')
                }
            } catch {
                setStatus('네트워크 오류가 발생했습니다.')
            }
        }

        verify()
    }, [])

    if (!showUI) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
                color: '#fff', fontFamily: 'sans-serif',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h2>{status}</h2>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="bg-orb orb1" />
            <div className="bg-orb orb2" />
            <div className="container">
                <div className="logo">입시보카</div>
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
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
            fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
        }}>
            <Suspense>
                <LoadingContent />
            </Suspense>
        </div>
    )
}
