const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hvjojxyogbqxvfwtacis.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_KEY || 'sb_publishable_m_Sy1xbV9nuY2nJWIZ7wzw_cWwCNI5q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    try {
        console.log('Testing equipments...');
        const { data: eq, error: eqErr } = await supabase.from('equipments').select('*').limit(2);
        console.log('Equipments:', JSON.stringify(eq));
        console.log('Eq Error:', JSON.stringify(eqErr));

        console.log('\nTesting events...');
        const { data: ev, error: evErr } = await supabase.from('events').select(`
            *,
            equipment_allocations (
            *,
            equipment:equipments (*)
            )
        `).limit(2);

        console.log('Events:', JSON.stringify(ev));
        console.log('Ev Error:', JSON.stringify(evErr));

        console.log('\nTesting view equipment_availability...');
        const { data: ea, error: eaErr } = await supabase.from('equipment_availability').select('*').limit(2);
        console.log('Availability:', JSON.stringify(ea));
        console.log('Availability Error:', JSON.stringify(eaErr));

    } catch (e) {
        console.error('Script crached:', e);
    }
}
checkDatabase();
