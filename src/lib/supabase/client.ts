import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * 브라우저에서 사용할 Supabase URL
 * HTTPS 페이지 → HTTP Supabase 직접 호출 시 Mixed Content 차단됨
 * → /api/supabase-proxy 를 통해 서버에서 중계
 */
function getClientUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (typeof window !== 'undefined' && raw.startsWith('http://')) {
    return `${window.location.origin}/api/supabase-proxy`
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
    getClientUrl(),
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
