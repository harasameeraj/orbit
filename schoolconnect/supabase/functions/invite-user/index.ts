// supabase/functions/invite-user/index.ts
// Deploy: supabase functions deploy invite-user
//
// Called by AdminUsers.jsx when admin adds a new student or teacher.
// Uses the service role key (Admin SDK) to create the auth user
// and send an invite email. The handle_new_user trigger then
// auto-creates the profiles row from user_metadata.
//
// POST body:
// {
//   email: string,
//   name: string,
//   role: 'teacher' | 'parent',
//   school_id: string,
//   // optional extras stored in metadata:
//   class_id?: string,       // for teachers
//   subject?: string,        // for teachers
//   student_id?: string,     // for parents (to link after creation)
// }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Admin client — only works server-side with service role key
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

serve(async (req) => {
  // Verify caller is an authenticated admin
  const authHeader = req.headers.get('Authorization') || ''
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Check caller is admin
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin') {
    return new Response('Forbidden — admin only', { status: 403 })
  }

  const body = await req.json()
  const { email, name, role, school_id, class_id, subject, student_id } = body

  if (!email || !name || !role || !school_id) {
    return new Response('Missing required fields', { status: 400 })
  }

  // Ensure the school_id matches the admin's school
  if (school_id !== callerProfile.school_id) {
    return new Response('Forbidden — wrong school', { status: 403 })
  }

  try {
    // 1. Create user via Admin SDK — sends magic-link invite email
    const { data: newUser, error: createErr } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          role,
          school_id,
          name,
          // Extra metadata stored for use after signup
          ...(class_id && { class_id }),
          ...(subject  && { subject }),
        },
        redirectTo: `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/login`,
      }
    )
    if (createErr) throw createErr

    const newUserId = newUser.user.id

    // 2. For teachers: link to class after profile is created
    if (role === 'teacher' && class_id && subject) {
      // Profile is created by trigger — wait briefly then link
      await new Promise(r => setTimeout(r, 500))
      const { error: tcErr } = await adminClient.from('teacher_classes').insert({
        teacher_id: newUserId,
        class_id,
        school_id,
        subject,
        is_class_teacher: false,
      })
      if (tcErr) console.warn('teacher_classes link warning:', tcErr.message)
    }

    // 3. For parents: link to student
    if (role === 'parent' && student_id) {
      await new Promise(r => setTimeout(r, 500))
      const { error: psErr } = await adminClient.from('parent_students').insert({
        parent_id: newUserId,
        student_id,
        school_id,
      })
      if (psErr) console.warn('parent_students link warning:', psErr.message)
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('invite-user error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
