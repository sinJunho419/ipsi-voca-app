import { NextRequest, NextResponse } from 'next/server'

/**
 * 인증 쿠키(ipsinavi_login) 없이 보호 페이지에 접근하면
 * "잘못된 접근입니다" 알림 후 창을 닫는다.
 */
export function middleware(request: NextRequest) {
    const loginCookie = request.cookies.get('ipsinavi_login')
    const hasSupabaseSession = request.cookies.getAll().some(c =>
        c.name.startsWith('sb-') && c.name.includes('auth-token')
    )

    // 입시내비 인증 쿠키 + Supabase 세션 둘 다 있어야 접근 허용
    if (!loginCookie?.value || !hasSupabaseSession) {
        return new NextResponse(
            `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>입시보카</title></head>
<body>
<script>
  alert("잘못된 접근입니다.");
  window.close();
  // window.close()가 동작하지 않는 환경 대비
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f0c29;color:#fff;font-family:sans-serif;"><div style="text-align:center;"><h2>잘못된 접근입니다.</h2><p style="color:#94a3b8;">이 창을 닫아주세요.</p></div></div>';
</script>
</body>
</html>`,
            {
                status: 403,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
        )
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/study/:path*',
        '/battle/:path*',
        '/report/:path*',
        '/profile/:path*',
    ],
}
