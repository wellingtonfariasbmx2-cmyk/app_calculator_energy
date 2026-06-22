import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hvjojxyogbqxvfwtacis.supabase.co';
const supabaseKey = 'sb_publishable_m_Sy1xbV9nuY2nJWIZ7wzw_cWwCNI5q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
    try {
        console.log('Fetching policies from Postgres...');

        // This query requires admin privileges usually, but let's try calling an RPC or doing it if possible
        // Actually, we can just use the Service Role key to query things. Wait, I don't have the service role key.
        // Let's check table info via standard REST API if possible, or just print the equipments result again. 
        // If an anonymous user can read them, RLS is OFF or there's a public policy. Let's see if we can read `company_id` null.

    } catch (e) {
        console.error('Script crashed:', e);
    }
}
checkPolicies();
