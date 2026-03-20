import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const result: Record<string, unknown> = {
        supabase_url: url,
        service_key_prefix: serviceKey ? serviceKey.substring(0, 20) + '...' : 'NOT SET',
        anon_key_prefix: anonKey ? anonKey.substring(0, 20) + '...' : 'NOT SET',
    }

    // 1. URL 접근 가능 여부 (raw fetch)
    try {
        const res = await fetch(`${url}/rest/v1/`, {
            headers: {
                'apikey': serviceKey!,
                'Authorization': `Bearer ${serviceKey!}`,
            },
        })
        result.rest_api_status = res.status
        result.rest_api_statusText = res.statusText
        if (!res.ok) {
            result.rest_api_body = (await res.text()).substring(0, 500)
        }
    } catch (e) {
        result.rest_api_error = e instanceof Error ? e.message : String(e)
    }

    // 2. Auth API 접근
    try {
        const res = await fetch(`${url}/auth/v1/settings`, {
            headers: {
                'apikey': serviceKey!,
            },
        })
        result.auth_api_status = res.status
        if (!res.ok) {
            result.auth_api_body = (await res.text()).substring(0, 500)
        } else {
            result.auth_api_ok = true
        }
    } catch (e) {
        result.auth_api_error = e instanceof Error ? e.message : String(e)
    }

    // 3. Supabase JS client로 간단한 쿼리
    try {
        const client = createClient(url!, serviceKey!, {
            auth: { autoRefreshToken: false, persistSession: false },
        })
        const { data, error } = await client
            .from('ipsinavi_login_info')
            .select('id')
            .limit(1)
        result.db_query_data = data
        result.db_query_error = error ? { message: error.message, code: error.code, details: error.details } : null
    } catch (e) {
        result.db_query_exception = e instanceof Error ? e.message : String(e)
    }

    return NextResponse.json(result, { status: 200 })
}
