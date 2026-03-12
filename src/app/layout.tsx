import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import KakaoRedirect from '@/components/KakaoRedirect'
import TabGuard from '@/components/TabGuard'

const pretendard = localFont({
  src: [
    { path: '../../public/fonts/Pretendard-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Pretendard-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/Pretendard-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/Pretendard-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../../public/fonts/Pretendard-ExtraBold.woff2', weight: '800', style: 'normal' },
    { path: '../../public/fonts/Pretendard-Black.woff2', weight: '900', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-pretendard',
})

export const metadata: Metadata = {
  title: '📚 영단어 학습',
  description: '영단어 플래시카드 & 퀴즈 학습 앱',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className={pretendard.className}>
        <KakaoRedirect />
        <TabGuard />
        {children}
      </body>
    </html>
  )
}
