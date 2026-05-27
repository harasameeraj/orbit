import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '../.env')
const envContent = fs.readFileSync(envPath, 'utf8')

const getEnvVal = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return match ? match[1].trim() : null
}

const SUPABASE_URL = getEnvVal('VITE_SUPABASE_URL')
const SUPABASE_ANON_KEY = getEnvVal('VITE_SUPABASE_ANON_KEY')

console.log('Testing Supabase Connection...')
console.log('URL:', SUPABASE_URL)
console.log('Anon Key length:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : 0)

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testUser(email, password) {
  try {
    console.log(`\nSigning in as ${email}...`)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.error(`Auth sign-in failed for ${email}:`, authError.message)
      return
    }
    console.log(`Auth sign-in successful! User ID:`, authData.user.id)
    console.log(`User metadata role:`, authData.user.user_metadata?.role)
    
    console.log(`Fetching profile using client SDK...`)
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*, schools(*), teacher_classes(class_id, subject, is_class_teacher, classes(id, name, grade, section))')
      .eq('id', authData.user.id)
      .single()
    
    if (profError) {
      console.error(`Profile fetch failed for ${email}:`, profError.message)
    } else {
      console.log(`Profile fetch successful for ${email}! Name:`, profile.name, `Role:`, profile.role)
    }
  } catch (err) {
    console.error(`Unexpected error for ${email}:`, err)
  }
}

async function test() {
  await testUser('admin@stxaviers.edu.in', 'Admin@1234')
  await testUser('teacher@stxaviers.edu.in', 'Teacher@1234')
  await testUser('parent@stxaviers.edu.in', 'Parent@1234')
}

test()
