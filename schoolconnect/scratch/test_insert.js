import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouljlevztweykjoxjhal.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aiAkLg0JpW7r7OQiVfprxg_LEhi_HrA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testInsert() {
  console.log('Attempting to insert a school...');
  const { data, error } = await supabase
    .from('schools')
    .insert({
      name: "St. Xavier's International Academy",
      address: "Plot No. 42, Knowledge Park III, Mumbai 400001",
      academic_year: "2024-2025"
    })
    .select();

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert success!', data);
  }
}

testInsert();
