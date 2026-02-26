import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '📚 영단어 학습',
  description: '영단어 플래시카드 & 퀴즈 학습 앱',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 폰트 CDN */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
