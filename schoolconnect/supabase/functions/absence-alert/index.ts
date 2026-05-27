// supabase/functions/absence-alert/index.ts
// Deploy: supabase functions deploy absence-alert
//
// This is triggered via a Supabase Database Webhook:
//   Table: attendance
//   Event: INSERT or UPDATE
//   Condition: status = 'absent'
//
// To set up the webhook:
// Supabase Dashboard → Database → Webhooks → Create new webhook
//   Name: absence_alert
//   Table: attendance
//   Events: INSERT, UPDATE
//   URL: https://<your-project>.supabase.co/functions/v1/absence-alert
//   HTTP Headers: Authorization: Bearer <service_role_key>

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY   = Deno.env.get('FCM_SERVER_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

serve(async (req) => {
  const payload = await req.json()

  // Supabase webhooks send { type, table, record, old_record }
  const record = payload.record

  // Only fire for absent records
  if (record.status !== 'absent') {
    return new Response('Not an absence — skipping', { status: 200 })
  }

  // Avoid double-firing: only send if this is a new absence or status changed to absent
  if (payload.type === 'UPDATE' && payload.old_record?.status === 'absent') {
    return new Response('Already sent — skipping', { status: 200 })
  }

  try {
    await sendAbsenceAlert(record)
    return new Response(JSON.stringify({ sent: true }), { status: 200 })
  } catch (err) {
    console.error('Absence alert error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

async function sendAbsenceAlert(record: any) {
  // 1. Get student name
  const { data: student } = await supabase
    .from('students')
    .select('name, school_id')
    .eq('id', record.student_id)
    .single()
  if (!student) throw new Error('Student not found')

  // 2. Get parent's FCM token
  const { data: links } = await supabase
    .from('parent_students')
    .select('profiles(id, name, fcm_token)')
    .eq('student_id', record.student_id)
  if (!links?.length) return

  const firstName = student.name.split(' ')[0]
  const dateStr = new Date(record.date).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const title = `${firstName} is absent today`
  const body  = `${student.name} has been marked absent for ${dateStr}. Please contact the school if this is unexpected.`

  // 3. Send notification to each parent
  for (const link of links) {
    const parent = (link as any).profiles
    if (!parent?.fcm_token) continue

    const success = await sendFcm(parent.fcm_token, title, body, {
      type: 'absence_alert',
      student_id: record.student_id,
      date: record.date,
    })

    // 4. Log
    await supabase.from('notification_log').insert({
      school_id:    student.school_id,
      recipient_id: parent.id,
      type:         'absence_alert',
      title,
      body,
      fcm_success:  success,
    })
  }
}

async function sendFcm(token: string, title: string, body: string, data: Record<string, string>) {
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body, sound: 'default' },
      data: { ...data, title, body },
      android: { priority: 'high' },
      apns: { payload: { aps: { alert: { title, body }, sound: 'default' } } },
    }),
  })
  const json = await res.json()
  return json.success === 1
}
