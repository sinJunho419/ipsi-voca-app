import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * 클라이언트 컴포넌트('use client')에서 사용하는 Supabase 싱글턴 클라이언트
 * 동일 인스턴스를 재사용하여 리얼타임 채널 중복 방지 및 50명+ 동시 접속 최적화
 */
export function createClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 20,  // 초당 이벤트 수 제한 (기본 10)
        },
      },
    }
  )

  return client
}
