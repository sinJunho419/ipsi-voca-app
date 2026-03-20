import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "http://89.167.97.217:8003";
const ANON_KEY = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImMxZjA0NzE1LTE3ZmItNDM4MC1iMGNmLTdjZThkMzBjNWI4OSJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczOTkwNTU1LCJleHAiOjE5MzE2NzA1NTV9.iRGuhAQAzMHOZ1Wd9GS_Toni2LAjTBmjdDwzzjlSz8K4ipn4BCi_enEur_ql_TWn7iFQTcSVMYXm77AD1WebaQ";

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function testAnonAccess() {
    console.log('--- Testing Anon Key Access ---')

    const { data, count, error } = await supabase
        .from('words')
        .select('*', { count: 'exact' })
        .eq('level', 'elem_3')
        .eq('set_no', 1)
        .limit(5)

    if (error) {
        console.error('Anon Access Error:', error.message)
    } else {
        console.log(`Anon Access Success! Found ${count} words for elem_3 Set 1.`)
        if (data && data.length > 0) {
            console.log('Sample word:', data[0].word)
        }
    }

    // Check sso_tokens table
    const { error: ssoError } = await supabase.from('sso_tokens').select('*').limit(1)
    console.log('\nsso_tokens access with Anon:', ssoError ? ssoError.message : 'OK')
}

testAnonAccess()
