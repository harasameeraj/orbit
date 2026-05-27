// supabase/functions/daily-report/index.ts
// Deploy: supabase functions deploy daily-report
// Schedule via Supabase Dashboard → Edge Functions → Add Cron
//   Cron expression: 0 10 * * 1-5   (10:30 UTC = 4:00 PM IST, Mon-Fri)
//
// This function:
// 1. Fetches all active schools and their report_time setting
// 2. For each school, finds every parent
// 3. For each parent→student pair, compiles today's data
// 4. Sends a push notification via FCM
// 5. Logs to notification_log table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')!   // Firebase Cloud Messaging server key

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

serve(async (req) => {
  // Allow manual trigger via POST with optional { school_id } body
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  const specificSchoolId = body.school_id

  try {
    const result = await runDailyReports(specificSchoolId)
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Daily report error:', err)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function runDailyReports(specificSchoolId?: string) {
  const today = new Date().toISOString().split('T')[0]
  let sent = 0
  let errors = 0

  // 1. Get all schools (or one specific school)
  let schoolsQuery = supabase.from('schools').select('*')
  if (specificSchoolId) schoolsQuery = schoolsQuery.eq('id', specificSchoolId)
  const { data: schools, error: schoolsErr } = await schoolsQuery
  if (schoolsErr) throw schoolsErr

  for (const school of schools ?? []) {
    console.log(`Processing school: ${school.name}`)

    // 2. Get all parents in this school with their FCM tokens
    const { data: parents } = await supabase
      .from('profiles')
      .select('id, name, fcm_token')
      .eq('school_id', school.id)
      .eq('role', 'parent')
      .not('fcm_token', 'is', null)

    for (const parent of parents ?? []) {
      // 3. Get their children
      const { data: links } = await supabase
        .from('parent_students')
        .select('student_id, students(id, name, class_id)')
        .eq('parent_id', parent.id)

      for (const link of links ?? []) {
        const student = link.students as any
        if (!student) continue

        // 4. Compile today's data for this student
        const report = await compileStudentReport(student, today, school.id)

        // 5. Build notification message
        const { title, body } = buildReportMessage(student.name, report)

        // 6. Send FCM push notification
        const success = await sendFcmNotification(parent.fcm_token, title, body, {
          type: 'daily_report',
          student_id: student.id,
        })

        // 7. Log to notification_log
        await supabase.from('notification_log').insert({
          school_id: school.id,
          recipient_id: parent.id,
          type: 'daily_report',
          title,
          body,
          fcm_success: success,
        })

        if (success) sent++
        else errors++
      }
    }
  }

  return { sent, errors, date: today }
}

async function compileStudentReport(student: any, date: string, schoolId: string) {
  const [attendanceRes, homeworkRes, behaviourRes, marksRes] = await Promise.all([
    // Today's attendance
    supabase
      .from('attendance')
      .select('status, marked_at')
      .eq('student_id', student.id)
      .eq('date', date)
      .single(),

    // Homework due today or tomorrow
    supabase
      .from('homework')
      .select('title, subject, due_date')
      .eq('class_id', student.class_id)
      .eq('is_draft', false)
      .gte('due_date', date)
      .order('due_date')
      .limit(3),

    // Today's behaviour log
    supabase
      .from('behaviour_logs')
      .select('note, type, profiles(name)')
      .eq('student_id', student.id)
      .eq('date', date)
      .limit(1),

    // Latest published marks (last 7 days)
    supabase
      .from('marks')
      .select('subject, score, max_score, exam_type, published_at')
      .eq('student_id', student.id)
      .eq('published', true)
      .gte('published_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('published_at', { ascending: false })
      .limit(3),
  ])

  return {
    attendance: attendanceRes.data,
    homework:   homeworkRes.data ?? [],
    behaviour:  behaviourRes.data?.[0] ?? null,
    newMarks:   marksRes.data ?? [],
  }
}

function buildReportMessage(studentName: string, report: any) {
  const lines: string[] = []
  const firstName = studentName.split(' ')[0]

  // Attendance
  if (report.attendance) {
    const status = report.attendance.status
    lines.push(status === 'present' ? '✅ Present today' : '❌ Absent today')
  } else {
    lines.push('⚠️ Attendance not marked')
  }

  // New marks
  if (report.newMarks.length > 0) {
    const m = report.newMarks[0]
    lines.push(`📊 ${m.subject}: ${m.score}/${m.max_score} (${m.exam_type})`)
  }

  // Upcoming homework
  if (report.homework.length > 0) {
    const hw = report.homework[0]
    lines.push(`📚 HW due ${hw.due_date}: ${hw.subject} — ${hw.title}`)
  }

  // Teacher remark
  if (report.behaviour?.note) {
    const note = report.behaviour.note
    const truncated = note.length > 60 ? note.slice(0, 60) + '…' : note
    lines.push(`💬 "${truncated}"`)
  }

  return {
    title: `${firstName}'s Daily Report`,
    body: lines.join('\n'),
  }
}

async function sendFcmNotification(
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<boolean> {
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: fcmToken,
        notification: { title, body, sound: 'default', badge: '1' },
        data: { ...data, title, body },
        android: { priority: 'high', notification: { channel_id: 'daily_reports' } },
        apns: { payload: { aps: { alert: { title, body }, sound: 'default', badge: 1 } } },
      }),
    })

    const result = await response.json()
    if (result.failure > 0) {
      console.warn('FCM send failed for token:', fcmToken.slice(0, 20), result)
      return false
    }
    return true
  } catch (err) {
    console.error('FCM HTTP error:', err)
    return false
  }
}
