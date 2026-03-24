import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Supabase Storage 이미지 허용
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '89.167.97.217',
        port: '8003',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Turbopack 루트 경고 제거 (C:\Users\PC\package-lock.json 충돌 방지)
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Supabase HTTP → HTTPS 프록시 (Mixed Content 해결)
  async rewrites() {
    return [
      {
        source: '/supabase-proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/:path*`,
      },
    ]
  },

  // 보안 헤더
  async headers() {
    return [
      {
        // 인증 경로: X-Frame-Options 제외 (iOS WebView 호환)
        source: '/api/auth/verify',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/((?!api/auth/verify).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
