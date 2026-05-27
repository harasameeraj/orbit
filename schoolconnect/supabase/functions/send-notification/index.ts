// supabase/functions/send-notification/index.ts
// Deploy: supabase functions deploy send-notification
//
// Generic notification sender called from the frontend for:
// - Announcements (teacher → class parents)
// - Fee reminders (admin → all parents)
// - School-wide notices (admin → all parents)
//
// POST body:
// {
//   type: 'announcement' | 'fee_reminder' | 'school_notice',
//   title: string,
//   body: string,
//   school_id: string,
//   class_id?: string,   // if omitted, sends to all parents in school
// }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY        = Deno.env.get('FCM_SERVER_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

serve(async (req) => {
  // Verify caller is authenticated (passes their JWT)
  const authHeader = req.headers.get('Authorization') || ''
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authErr || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { type, title, body, school_id, class_id } = await req.json()

  if (!title || !body || !school_id) {
    return new Response('Missing required fields', { status: 400 })
  }

  try {
    // Build target audience
    let query = supabase
      .from('profiles')
      .select('id, fcm_token')
      .eq('school_id', school_id)
      .eq('role', 'parent')
      .not('fcm_token', 'is', null)

    // If class_id provided, only target parents of students in that class
    let targetParentIds: string[] | null = null
    if (class_id) {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', class_id)
      const studentIds = students?.map(s => s.id) || []

      const { data: parentLinks } = await supabase
        .from('parent_students')
        .select('parent_id')
        .in('student_id', studentIds)
      targetParentIds = [...new Set(parentLinks?.map(l => l.parent_id) || [])]
      query = query.in('id', targetParentIds)
    }

    const { data: parents } = await query

    // Send in batches of 500 (FCM multicast limit)
    const tokens = parents?.map(p => p.fcm_token).filter(Boolean) || []
    const BATCH = 500
    let sent = 0

    for (let i = 0; i < tokens.length; i += BATCH) {
      const batch = tokens.slice(i, i + BATCH)
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${FCM_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_ids: batch,
          notification: { title, body, sound: 'default' },
          data: { type, title, body },
          android: { priority: 'high' },
          apns: { payload: { aps: { alert: { title, body }, sound: 'default' } } },
        }),
      })
      const json = await res.json()
      sent += json.success || 0
    }

    // Log per parent
    const logs = parents?.map(p => ({
      school_id,
      recipient_id: p.id,
      type,
      title,
      body,
      fcm_success: true,
    })) || []
    if (logs.length) await supabase.from('notification_log').insert(logs)

    return new Response(
      JSON.stringify({ success: true, sent, total: tokens.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
