import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

const ORIGINAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

/**
 * 브라우저에서 사용할 Supabase URL
 * HTTPS 페이지 → HTTP Supabase 직접 호출 시 Mixed Content 차단됨
 * → /api/supabase-proxy 를 통해 서버에서 중계
 */
function getClientUrl(): string {
  if (typeof window !== 'undefined' && ORIGINAL_SUPABASE_URL.startsWith('http://')) {
    return `${window.location.origin}/api/supabase-proxy`
  }
  return ORIGINAL_SUPABASE_URL
}

/**
 * 원본 Supabase URL 기반 storageKey 생성
 * 프록시 URL이 달라져도 인증 쿠키 이름이 원본과 동일하게 유지되어야
 * 서버(server.ts)와 브라우저(client.ts)가 같은 세션을 공유할 수 있음
 */
function getStorageKey(): string {
  try {
    const hostname = new URL(ORIGINAL_SUPABASE_URL).hostname
    return `sb-${hostname}-auth-token`
  } catch {
    return 'sb-auth-token'
  }
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
      auth: {
        storageKey: getStorageKey(),
      },
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    }
  )

  return client
}
