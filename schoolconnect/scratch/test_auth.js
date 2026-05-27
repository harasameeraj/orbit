import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouljlevztweykjoxjhal.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aiAkLg0JpW7r7OQiVfprxg_LEhi_HrA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuth() {
  const credentials = [
    { email: 'admin@stxaviers.edu.in', password: 'Admin@1234' },
    { email: 'teacher@stxaviers.edu.in', password: 'Teacher@1234' },
    { email: 'parent@stxaviers.edu.in', password: 'Parent@1234' }
  ];

  for (const cred of credentials) {
    console.log(`Trying to sign in with ${cred.email}...`);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cred.email,
        password: cred.password
      });

      if (error) {
        console.log(`  Sign in failed: ${error.message} (Code: ${error.status || error.code})`);
      } else {
        console.log(`  Sign in success! User ID: ${data.user.id}`);
      }
    } catch (e) {
      console.log(`  Exception:`, e.message);
    }
  }
}

testAuth();
