import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://nmujlvzloxquskxqzawj.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tdWpsdnpsb3hxdXNreHF6YXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNzI2NzUsImV4cCI6MjA4NzY0ODY3NX0.ybZiNpaD1RhszzIolHVt8hh80lYL6MjmHl6QIKwic-E";

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
