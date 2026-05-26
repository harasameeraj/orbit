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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
      }
    })
  }

  // Verify caller is an authenticated admin
  const authHeader = req.headers.get('Authorization') || ''
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) {
    return new Response('Unauthorized', { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  // Check caller is admin
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin') {
    return new Response('Forbidden — admin only', { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  const body = await req.json()
  const { email, name, role, school_id, class_id, subject, student_id } = body

  if (!email || !name || !role || !school_id) {
    return new Response('Missing required fields', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  // Ensure the school_id matches the admin's school
  if (school_id !== callerProfile.school_id) {
    return new Response('Forbidden — wrong school', { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    let newUserId = null

    // Check if the user already exists in auth
    const { data: userList, error: listErr } = await adminClient.auth.admin.listUsers()
    if (listErr) throw listErr

    const existingUser = userList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

    if (existingUser) {
      newUserId = existingUser.id
      console.log(`User already exists with ID ${newUserId}. Linking and re-sending invite.`)

      // Update metadata
      await adminClient.auth.admin.updateUserById(newUserId, {
        user_metadata: {
          role,
          school_id,
          name,
          ...(class_id && { class_id }),
          ...(subject  && { subject }),
        }
      })

      // Re-send invite email so the parent gets their login link
      const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5174'
      try {
        await adminClient.auth.admin.inviteUserByEmail(email, {
          data: { role, school_id, name },
          redirectTo: `${siteUrl}/set-password`,
        })
        console.log(`Re-invite email sent to ${email}`)
      } catch (reinviteErr) {
        // Non-fatal: user already exists, they can use password reset
        console.warn(`Re-invite failed for existing user ${email}:`, reinviteErr.message)
      }
    } else {
      // 1. Create user via Admin SDK — sends magic-link invite email
      const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5174'
      const { data: newUser, error: createErr } = await adminClient.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            role,
            school_id,
            name,
            ...(class_id && { class_id }),
            ...(subject  && { subject }),
          },
          redirectTo: `${siteUrl}/set-password`,
        }
      )
      if (createErr) throw createErr
      newUserId = newUser.user.id
    }

    // 2. For teachers: link to class after profile is created
    if (role === 'teacher' && class_id && subject) {
      await new Promise(r => setTimeout(r, 600))
      // Verify if link already exists
      const { data: existingLink } = await adminClient
        .from('teacher_classes')
        .select('id')
        .eq('teacher_id', newUserId)
        .eq('class_id', class_id)
        .eq('subject', subject)
        .maybeSingle()

      if (!existingLink) {
        const { error: tcErr } = await adminClient.from('teacher_classes').insert({
          teacher_id: newUserId,
          class_id,
          school_id,
          subject,
          is_class_teacher: false,
        })
        if (tcErr) console.warn('teacher_classes link warning:', tcErr.message)
      }
    }

    // 3. For parents: link to student
    if (role === 'parent' && student_id) {
      await new Promise(r => setTimeout(r, 600))
      // Verify if link already exists
      const { data: existingLink } = await adminClient
        .from('parent_students')
        .select('id')
        .eq('parent_id', newUserId)
        .eq('student_id', student_id)
        .maybeSingle()

      if (!existingLink) {
        const { error: psErr } = await adminClient.from('parent_students').insert({
          parent_id: newUserId,
          student_id,
          school_id,
        })
        if (psErr) console.warn('parent_students link warning:', psErr.message)
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  } catch (err) {
    console.error('invite-user error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})
