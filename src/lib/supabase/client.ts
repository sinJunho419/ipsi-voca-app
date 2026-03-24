import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * 브라우저에서 사용할 Supabase URL 결정
 * - HTTPS 배포 환경에서 HTTP Supabase 직접 호출 시 Mixed Content 차단됨
 * - Next.js rewrites 프록시(/supabase-proxy)를 통해 우회
 */
function getBrowserSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (typeof window !== 'undefined' && raw.startsWith('http://')) {
    return `${window.location.origin}/supabase-proxy`
  }
  return raw
}

/**
 * 클라이언트 컴포넌트('use client')에서 사용하는 Supabase 싱글턴 클라이언트
 * 동일 인스턴스를 재사용하여 리얼타임 채널 중복 방지 및 50명+ 동시 접속 최적화
 */
export function createClient() {
  if (client) return client

  client = createBrowserClient(
    getBrowserSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    }
  )

  return client
}
