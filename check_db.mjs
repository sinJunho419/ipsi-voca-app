import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "http://89.167.97.217:8003";
const SERVICE_KEY = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImMxZjA0NzE1LTE3ZmItNDM4MC1iMGNmLTdjZThkMzBjNWI4OSJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzM5OTA1NTUsImV4cCI6MTkzMTY3MDU1NX0.5Tf1q0maumMaxZldd11ftL1ZxvbMJ_T5nEQqRlYup7V3R31VFR4zo1Ecg1PIpK31flgwzLpHO2FkHkDsA4BIag";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function checkDb() {
    console.log('--- Checking Supabase Database Status ---')

    // 1. Check words table
    const { count, error: countError } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })

    if (countError) {
        console.error('Error counting words:', countError.message)
    } else {
        console.log(`Total words in DB: ${count}`)
    }

    // 2. Check unique levels and sets
    const { data: levels, error: levelError } = await supabase
        .from('words')
        .select('level, set_no')
        .order('level', { ascending: true })

    if (levelError) {
        console.error('Error fetching levels:', levelError.message)
    } else if (levels && levels.length > 0) {
        const levelStats = {}
        levels.forEach(row => {
            if (!levelStats[row.level]) levelStats[row.level] = new Set()
            levelStats[row.level].add(row.set_no)
        })

        console.log('\nLevel & Set Statistics:')
        Object.keys(levelStats).forEach(lvl => {
            const sets = Array.from(levelStats[lvl]).sort((a, b) => a - b)
            console.log(`- ${lvl}: ${sets.length} sets (Sets: ${sets.join(', ')})`)
        })
    } else {
        console.log('No data found in words table.')
    }

    // 3. Check if sso_tokens table exists
    const { error: ssoError } = await supabase.from('sso_tokens').select('id').limit(1)
    if (ssoError) {
        console.log('\nsso_tokens table check: NOT FOUND or error -', ssoError.message)
    } else {
        console.log('\nsso_tokens table check: OK')
    }
}

checkDb()
