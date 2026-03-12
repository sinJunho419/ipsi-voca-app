import { NextRequest, NextResponse } from 'next/server'

const FIVE_MINUTES = 5 * 60

/** XOR 복호화 */
function xorDecrypt(encrypted: Buffer, key: string): string {
    const keyBytes = Buffer.from(key, 'utf8')
    const result = Buffer.alloc(encrypted.length)
    for (let i = 0; i < encrypted.length; i++) {
        result[i] = encrypted[i] ^ keyBytes[i % keyBytes.length]
    }
    return result.toString('utf8')
}

/** GET fallback */
export async function GET(request: NextRequest) {
    const payload = request.nextUrl.searchParams.get('payload')
    return handleVerify(payload, request.nextUrl.origin)
}

/**
 * POST /api/auth/verify
 *
 * target="_blank" 제거 후 WebView 내부에서 동작
 * redirect 없이 HTML 직접 반환 → WebView 이탈 방지
 */
export async function POST(request: NextRequest) {
    const contentType = request.headers.get('content-type') || ''
    let payload: string | null = null

    try {
        if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData()
            payload = formData.get('payload') as string
        } else {
            const body = await request.json()
            payload = body.payload
        }
    } catch {
        payload = null
    }

    return handleVerify(payload, request.nextUrl.origin)
}

/** 공통 검증 로직 */
function handleVerify(payload: string | null, origin: string) {
    const IPSI_NAVI_URL = process.env.IPSI_NAVI_URL || 'https://ipsinavi.com'

    try {
        if (!payload) {
            return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
        }

        const secretKey = process.env.VOCA_SECRET_KEY?.trim()
        if (!secretKey) {
            return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
        }

        const encrypted = Buffer.from(payload, 'base64')
        let decrypted: string
        try {
            decrypted = xorDecrypt(encrypted, secretKey)
        } catch {
            return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
        }

        const parts = decrypted.split('|')
        if (parts.length < 3) {
            return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
        }

        const nid = parts[0]
        const name = parts[1]
        const ts = parseInt(parts[2], 10)

        if (!nid || !name || isNaN(ts)) {
            return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
        }

        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - ts) > FIVE_MINUTES) {
            return errorPage('인증 시간이 만료되었습니다.', IPSI_NAVI_URL)
        }

        // 검증 통과 → 로딩 화면 + 세션 처리
        return loadingPage(payload, name, IPSI_NAVI_URL)

    } catch (err) {
        console.error('Verify error:', err)
        return errorPage('비정상 접근입니다.', IPSI_NAVI_URL)
    }
}

/** 환영 로딩 화면 — JS가 /api/auth/verify/session 호출 후 /study로 이동 */
function loadingPage(payload: string, userName: string, ipsiNaviUrl: string) {
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>입시보카</title>
<link rel="prefetch" href="/study" />
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #fff;
    overflow: hidden;
}
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
</style>
</head>
<body>
<div class="bg-orb orb1"></div>
<div class="bg-orb orb2"></div>
<div class="container">
    <div class="logo">입시보카</div>
    <div class="greeting">${userName}님, 환영합니다!</div>
    <div class="spinner-wrap"><div class="spinner"></div></div>
    <div class="status" id="status">로그인 처리 중<span class="dots"></span></div>
</div>
<script>
(async function() {
    var status = document.getElementById('status');
    try {
        var res = await fetch('/api/auth/verify/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload: '${payload}' }),
            credentials: 'same-origin',
        });
        var data = await res.json();
        if (data.ok) {
            status.textContent = '로그인 완료!';
            window.location.href = '/study';
        } else {
            alert(data.error || '로그인에 실패했습니다.');
            window.location.href = '${ipsiNaviUrl}';
        }
    } catch (e) {
        alert('로그인 처리 중 오류가 발생했습니다.');
        window.location.href = '${ipsiNaviUrl}';
    }
})();
</script>
</body>
</html>`

    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
}

/** 에러 알림 + 입시내비로 이동 */
function errorPage(message: string, redirectUrl: string) {
    const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>입시보카</title></head>
<body>
<script>
  alert("${message}");
  window.location.href = "${redirectUrl}";
</script>
</body>
</html>`

    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
}
