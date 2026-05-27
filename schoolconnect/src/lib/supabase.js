import { createClient } from '@supabase/supabase-js'

// ─── Client ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase env vars missing. Copy .env.example → .env and fill in your project values.'
  )
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder'
)

// ─── School lookup (used by school code screen — no auth required) ────────────

export async function getSchoolByCode(code) {
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, code, brand_color, logo_url')
    .eq('code', code.toUpperCase().trim())
    .single()
  if (error) return null
  return data
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, schools(*), teacher_classes(class_id, subject, is_class_teacher, classes(id, name, grade, section))')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

// ─── Invite helpers (admin calls these) ──────────────────────────────────────

export async function inviteUser({ email, name, role, schoolId, extraMeta = {} }) {
  let edgeFnErrorMsg = null
  try {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email, name, role, school_id: schoolId, ...extraMeta }
    })
    if (!error) return data
    edgeFnErrorMsg = error?.message || JSON.stringify(error)
    console.warn('invite-user Edge Function returned error, trying fallback:', error)
  } catch (err) {
    edgeFnErrorMsg = err?.message || String(err)
    console.warn('invite-user Edge Function invocation failed, trying fallback:', err)
  }

  // FALLBACK: Sign up user using standard client with persistSession: false
  // to avoid modifying the current active session in localStorage
  const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const defaultPassword = role === 'parent' ? 'Parent@1234' : 'Teacher@1234'
  
  let signUpData = null
  let signUpError = null
  
  try {
    const res = await tempSupabase.auth.signUp({
      email,
      password: defaultPassword,
      options: {
        data: {
          school_id: schoolId,
          role,
          name
        }
      }
    })
    signUpData = res.data
    signUpError = res.error
  } catch (err) {
    signUpError = err
  }

  if (signUpError) {
    // Check if the user is already registered (or if rate limit is hit, meaning the user actually got created)
    const errMsg = signUpError.message || ''
    if (
      errMsg.toLowerCase().includes('already') ||
      errMsg.toLowerCase().includes('rate limit') ||
      signUpError.status === 420 ||
      signUpError.status === 429 ||
      signUpError.code === 'user_already_exists'
    ) {
      console.log('User already registered or email rate limit reached. Proceeding with database linking fallback...')
    } else {
      throw signUpError
    }
  }

  let userId = signUpData?.user?.id

  // If signUp didn't return user.id (because user already existed or rate limit hit),
  // let's fetch the profile from the database matching this name and role.
  if (!userId) {
    const { data: existingProfiles, error: fetchErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId)
      .eq('role', role)
      .eq('name', name)
      .limit(1)

    if (fetchErr || !existingProfiles || existingProfiles.length === 0) {
      // User exists in auth but no profile yet — they're pending email confirmation.
      // Don't throw: student record is already created. Return a warning so the
      // import row shows as success with a note instead of failing entirely.
      return {
        success: true,
        fallback: true,
        pendingConfirmation: true,
        warning: `Parent account already exists but is pending email confirmation. Ask them to check their inbox or resend the invite from the Users table.`
      }
    }
    userId = existingProfiles[0].id
  }

  // Link teacher to class if class_id and subject are provided
  if (role === 'teacher' && extraMeta.class_id && extraMeta.subject) {
    const { error: tcErr } = await supabase.from('teacher_classes').insert({
      teacher_id: userId,
      class_id: extraMeta.class_id,
      school_id: schoolId,
      subject: extraMeta.subject,
      is_class_teacher: extraMeta.is_class_teacher || false
    })
    if (tcErr && !tcErr.message?.toLowerCase().includes('duplicate')) {
      console.warn('teacher_classes link warning:', tcErr.message)
    }
  }

  // Link parent to student if student_id is provided
  if (role === 'parent' && extraMeta.student_id) {
    const { error: psErr } = await supabase.from('parent_students').insert({
      parent_id: userId,
      student_id: extraMeta.student_id,
      school_id: schoolId
    })
    if (psErr && !psErr.message?.toLowerCase().includes('duplicate')) {
      console.warn('parent_students link warning:', psErr.message)
    }
  }

  return { success: true, user_id: userId, fallback: true, edgeFnError: edgeFnErrorMsg }
}

// ─── Students ─────────────────────────────────────────────────────────────────

export async function getStudentsByClass(classId) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .order('roll_no')
  if (error) throw error
  return data
}

export async function getStudentProfile(studentId) {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      classes(name, grade, section),
      parent_students(
        profiles(id, name, phone)
      )
    `)
    .eq('id', studentId)
    .single()
  if (error) throw error
  return data
}

export async function getAllStudents(schoolId) {
  const { data, error } = await supabase
    .from('students')
    .select('*, classes(name)')
    .eq('school_id', schoolId)
    .order('name')
  if (error) throw error
  return data
}

export async function createStudent(student) {
  const { data, error } = await supabase
    .from('students')
    .insert(student)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendanceByDate(classId, date) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, students(name, roll_no)')
    .eq('class_id', classId)
    .eq('date', date)
  if (error) throw error
  return data
}

export async function getStudentAttendance(studentId, fromDate, toDate) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

// Upsert attendance for a whole class in one call
export async function submitClassAttendance(records) {
  // records = [{ school_id, student_id, class_id, teacher_id, date, status }]
  const { error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'school_id,student_id,date' })
  if (error) throw error
}

// ─── Marks ────────────────────────────────────────────────────────────────────

export async function getMarksByStudent(studentId) {
  const { data, error } = await supabase
    .from('marks')
    .select('*')
    .eq('student_id', studentId)
    .eq('published', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getMarksByClass(classId, subject, examType) {
  const { data, error } = await supabase
    .from('marks')
    .select('*, students(name, roll_no)')
    .eq('class_id', classId)
    .eq('subject', subject)
    .eq('exam_type', examType)
  if (error) throw error
  return data
}

export async function upsertMarks(records) {
  const { error } = await supabase
    .from('marks')
    .upsert(records, { onConflict: 'school_id,student_id,subject,exam_type' })
  if (error) throw error
}

export async function publishMarks(classId, subject, examType) {
  const { error } = await supabase
    .from('marks')
    .update({ published: true })
    .eq('class_id', classId)
    .eq('subject', subject)
    .eq('exam_type', examType)
  if (error) throw error
}

// ─── Homework ─────────────────────────────────────────────────────────────────

export async function getHomeworkByClass(classId) {
  const { data, error } = await supabase
    .from('homework')
    .select('*, profiles(name)')
    .eq('class_id', classId)
    .eq('is_draft', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createHomework(hw) {
  const { data, error } = await supabase
    .from('homework')
    .insert(hw)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Behaviour Logs ───────────────────────────────────────────────────────────

export async function getBehaviourLogs(studentId, date) {
  let query = supabase
    .from('behaviour_logs')
    .select('*, profiles(name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (date) query = query.eq('date', date)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function addBehaviourLog(log) {
  const { data, error } = await supabase
    .from('behaviour_logs')
    .insert(log)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Announcements ────────────────────────────────────────────────────────────

export async function getAnnouncements(classId) {
  const { data, error } = await supabase
    .from('announcements')
    .select('*, profiles(name)')
    .or(`class_id.eq.${classId},class_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data
}

export async function createAnnouncement(ann) {
  const { data, error } = await supabase
    .from('announcements')
    .insert(ann)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getOrCreateThread(parentId, teacherId, studentId, schoolId) {
  // Try to find existing thread
  let { data } = await supabase
    .from('message_threads')
    .select('*')
    .eq('parent_id', parentId)
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId)
    .maybeSingle()

  if (!data) {
    const { data: created, error } = await supabase
      .from('message_threads')
      .insert({ parent_id: parentId, teacher_id: teacherId, student_id: studentId, school_id: schoolId })
      .select()
      .single()
    if (error) throw error
    data = created
  }
  return data
}

export async function getMessages(threadId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles(name, role)')
    .eq('thread_id', threadId)
    .order('sent_at')
  if (error) throw error
  return data
}

export async function sendMessage(threadId, senderId, text, schoolId) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ thread_id: threadId, sender_id: senderId, text, school_id: schoolId })
    .select()
    .single()
  if (error) throw error
  return data
}

export function subscribeToMessages(threadId, callback) {
  return supabase
    .channel(`thread:${threadId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `thread_id=eq.${threadId}`
    }, payload => callback(payload.new))
    .subscribe()
}

// ─── Notices ──────────────────────────────────────────────────────────────────

export async function getNotices(schoolId, adminView = false) {
  let query = supabase
    .from('notices')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
  if (!adminView) query = query.eq('is_visible', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createNotice(notice) {
  const { data, error } = await supabase
    .from('notices')
    .insert(notice)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleNoticeVisibility(id, isVisible) {
  const { error } = await supabase
    .from('notices')
    .update({ is_visible: isVisible })
    .eq('id', id)
  if (error) throw error
}

// ─── Timetable ────────────────────────────────────────────────────────────────

export async function getTimetable(classId) {
  const { data, error } = await supabase
    .from('timetable')
    .select('*, profiles(name)')
    .eq('class_id', classId)
    .order('day_of_week')
    .order('start_time')
  if (error) throw error
  return data
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export async function getCalendarEvents(schoolId, fromDate, toDate) {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('school_id', schoolId)
    .gte('event_date', fromDate)
    .lte('event_date', toDate)
    .order('event_date')
  if (error) throw error
  // Normalise: 'name' field (added in migration 003) falls back to 'title'
  return (data || []).map(r => ({ ...r, name: r.name || r.title }))
}

// ─── FCM Token ────────────────────────────────────────────────────────────────

export async function saveFcmToken(userId, token) {
  const { error } = await supabase
    .from('profiles')
    .update({ fcm_token: token })
    .eq('id', userId)
  if (error) throw error
}

// ─── School Settings ──────────────────────────────────────────────────────────

export async function updateSchoolSettings(schoolId, settings) {
  const { error } = await supabase
    .from('schools')
    .update(settings)
    .eq('id', schoolId)
  if (error) throw error
}

// ─── Timetable Write ──────────────────────────────────────────────────────────

export async function upsertTimetableSlot(slot) {
  // slot: { class_id, day_of_week, start_time, end_time, subject, teacher_id, school_id }
  const { data, error } = await supabase
    .from('timetable')
    .upsert(slot, { onConflict: 'class_id,day_of_week,start_time' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTimetableSlot(id) {
  const { error } = await supabase
    .from('timetable')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Calendar Events Write ────────────────────────────────────────────────────

export async function createCalendarEvent(event) {
  // Support both 'name' (UI) and 'title' (DB legacy). Migration 003 adds 'name' column.
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({ ...event, title: event.name || event.title })
    .select()
    .single()
  if (error) throw error
  return { ...data, name: data.name || data.title }
}

export async function updateCalendarEvent(id, updates) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({ ...updates, title: updates.name || updates.title })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return { ...data, name: data.name || data.title }
}

export async function deleteCalendarEvent(id) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Student Photo ────────────────────────────────────────────────────────────

export async function uploadStudentPhoto(studentId, file) {
  const ext = file.name.split('.').pop()
  const path = `${studentId}/photo.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('student-photos')
    .upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('student-photos')
    .getPublicUrl(path)

  const { error: updateError } = await supabase
    .from('students')
    .update({ photo_url: publicUrl })
    .eq('id', studentId)
  if (updateError) throw updateError

  return publicUrl
}

// ─── All Teachers (for timetable dropdown) ────────────────────────────────────

export async function getTeachersBySchool(schoolId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('school_id', schoolId)
    .eq('role', 'teacher')
    .order('name')
  if (error) throw error
  return data
}

// ─── All Classes (for timetable) ─────────────────────────────────────────────

export async function getClassesBySchool(schoolId) {
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, grade')
    .eq('school_id', schoolId)
    .order('grade')
  if (error) throw error
  return data
}

// ─── School Stats (Admin Dashboard KPIs) ─────────────────────────────────────

export async function getSchoolStats(schoolId) {
  const today = new Date().toISOString().split('T')[0]

  const [studentsRes, teachersRes, attendanceRes] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'teacher'),
    supabase.from('attendance').select('status').eq('school_id', schoolId).eq('date', today),
  ])

  const totalStudents = studentsRes.count || 0
  const totalTeachers = teachersRes.count || 0
  const attRows = attendanceRes.data || []
  const presentCount = attRows.filter(r => r.status === 'present').length
  const attendancePct = attRows.length > 0 ? Math.round((presentCount / attRows.length) * 100) : null

  return { totalStudents, totalTeachers, attendancePct, attendanceMarked: attRows.length > 0 }
}

// ─── Teachers for a class (Parent Profile) ───────────────────────────────────

export async function getTeachersByClass(classId) {
  const { data, error } = await supabase
    .from('teacher_classes')
    .select('profiles(id, name, subject_specialty, avatar_url)')
    .eq('class_id', classId)
  if (error) throw error
  return (data || []).map(r => r.profiles).filter(Boolean)
}

// ─── Weekly Attendance Stats (Admin Dashboard Chart) ─────────────────────────

export async function getWeeklyAttendanceStats(schoolId) {
  // Get Mon–Fri of current week
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

  const days = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }

  const { data, error } = await supabase
    .from('attendance')
    .select('date, status')
    .eq('school_id', schoolId)
    .in('date', days)
  if (error) throw error

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  return days.map((date, i) => {
    const dayRows = (data || []).filter(r => r.date === date)
    const present = dayRows.filter(r => r.status === 'present').length
    const late = dayRows.filter(r => r.status === 'late').length
    return { day: dayLabels[i], present, late, date }
  })
}

// ─── Fee Management ──────────────────────────────────────────────────────────

export async function getFeeStructures(schoolId) {
  const { data, error } = await supabase
    .from('fee_structures')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createFeeStructure(structure) {
  const { data, error } = await supabase
    .from('fee_structures')
    .insert(structure)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFeeStructure(id, updates) {
  const { data, error } = await supabase
    .from('fee_structures')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFeeStructure(id) {
  const { error } = await supabase
    .from('fee_structures')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

export async function getStudentFees(schoolId, filters = {}) {
  let q = supabase
    .from('student_fees')
    .select(`
      *,
      students!inner(id, name, roll_no, class_id, classes(name)),
      fee_structures(id, name, frequency)
    `)
    .eq('school_id', schoolId)
    .order('due_date', { ascending: false })

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.classId) q = q.eq('students.class_id', filters.classId)
  if (filters.studentId) q = q.eq('student_id', filters.studentId)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getFeeStats(schoolId) {
  const { data, error } = await supabase
    .from('student_fees')
    .select('status, amount_due, amount_paid')
    .eq('school_id', schoolId)
  if (error) throw error
  const rows = data || []
  const total = rows.reduce((s, r) => s + Number(r.amount_due), 0)
  const collected = rows.reduce((s, r) => s + Number(r.amount_paid), 0)
  const pending = rows.filter(r => r.status === 'pending' || r.status === 'overdue')
    .reduce((s, r) => s + (Number(r.amount_due) - Number(r.amount_paid)), 0)
  const overdue = rows.filter(r => r.status === 'overdue').length
  const paid = rows.filter(r => r.status === 'paid').length
  return { total, collected, pending, overdue, paidCount: paid, totalCount: rows.length }
}

export async function upsertStudentFee(record) {
  const { data, error } = await supabase
    .from('student_fees')
    .upsert(record, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function recordPayment(feeId, { amountPaid, paymentMode, receiptNo, remarks }) {
  // First get current record
  const { data: current, error: fetchErr } = await supabase
    .from('student_fees')
    .select('amount_due, amount_paid')
    .eq('id', feeId)
    .single()
  if (fetchErr) throw fetchErr

  const totalPaid = Number(current.amount_paid) + Number(amountPaid)
  const newStatus = totalPaid >= Number(current.amount_due) ? 'paid'
    : totalPaid > 0 ? 'partial' : 'pending'

  const { data, error } = await supabase
    .from('student_fees')
    .update({
      amount_paid: totalPaid,
      status: newStatus,
      paid_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
      payment_mode: paymentMode,
      receipt_no: receiptNo,
      remarks,
    })
    .eq('id', feeId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function bulkCreateFeeRecords(schoolId, feeStructureId, studentIds, dueDate) {
  // Get fee structure amount
  const { data: fs, error: fsErr } = await supabase
    .from('fee_structures')
    .select('amount')
    .eq('id', feeStructureId)
    .single()
  if (fsErr) throw fsErr

  const records = studentIds.map(studentId => ({
    school_id: schoolId,
    student_id: studentId,
    fee_structure_id: feeStructureId,
    amount_due: fs.amount,
    amount_paid: 0,
    due_date: dueDate,
    status: new Date(dueDate) < new Date() ? 'overdue' : 'pending',
  }))

  const { data, error } = await supabase
    .from('student_fees')
    .insert(records)
    .select()
  if (error) throw error
  return data
}

export async function sendFeeReminder(schoolId, sentBy, message, recipientCount) {
  const { error } = await supabase
    .from('fee_reminders')
    .insert({ school_id: schoolId, sent_by: sentBy, message, recipient_count: recipientCount })
  if (error) throw error

  // Double-write to announcements as a school-wide announcement (class_id: null) so parents can view it in-app
  const { error: annErr } = await supabase
    .from('announcements')
    .insert({
      school_id: schoolId,
      class_id: null,
      teacher_id: sentBy,
      title: 'Fee Payment Reminder',
      body: message,
      is_urgent: true
    })
  if (annErr) console.warn('Failed to save fee announcement:', annErr.message)

  // Fire push via Edge Function
  await supabase.functions.invoke('send-notification', {
    body: { type: 'fee_reminder', title: 'Fee Reminder', body: message, school_id: schoolId }
  }).catch(console.warn)
}

export async function getFeeReminderHistory(schoolId) {
  const { data, error } = await supabase
    .from('fee_reminders')
    .select('*, profiles(name)')
    .eq('school_id', schoolId)
    .order('sent_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}

// ─── Teacher Assignment Management ───────────────────────────────────────────

export async function getTeacherAssignments(teacherId) {
  const { data, error } = await supabase
    .from('teacher_classes')
    .select('*, classes(id, name, grade, section)')
    .eq('teacher_id', teacherId)
  if (error) throw error
  return data || []
}

export async function addTeacherAssignment({ teacher_id, class_id, school_id, subject, is_class_teacher }) {
  const { data, error } = await supabase
    .from('teacher_classes')
    .insert({ teacher_id, class_id, school_id, subject, is_class_teacher: is_class_teacher || false })
    .select('*, classes(id, name, grade, section)')
    .single()
  if (error) throw error
  return data
}

export async function removeTeacherAssignment(id) {
  const { error } = await supabase.from('teacher_classes').delete().eq('id', id)
  if (error) throw error
}

// ─── Teacher Mobile compatibility functions ───────────────────────────────────

export async function getTeacherClasses(teacherId) {
  const { data, error } = await supabase
    .from('teacher_classes')
    .select('*, classes(id, name, grade, section)')
    .eq('teacher_id', teacherId)
  if (error) throw error
  return data
}

export async function getExamsBySchool(schoolId, subject = null) {
  let q = supabase
    .from('marks')
    .select('exam_type, subject, school_id')
    .eq('school_id', schoolId)
  if (subject) q = q.eq('subject', subject)
  const { data, error } = await q
  if (error) throw error
  // Deduplicate into exam-like objects
  const seen = new Set()
  return (data || []).reduce((acc, row) => {
    const key = `${row.exam_type}__${row.subject}`
    if (!seen.has(key)) {
      seen.add(key)
      acc.push({ id: key, name: row.exam_type, subject: row.subject, max_marks: 100 })
    }
    return acc
  }, [])
}

export async function getAttendanceByClass(classId, date = null) {
  let q = supabase
    .from('attendance')
    .select('*, students(name, roll_no)')
    .eq('class_id', classId)
  if (date) q = q.eq('date', date)
  const { data, error } = await q.order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function upsertAttendance(records) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'school_id,student_id,date' })
    .select()
  if (error) throw error
  return data
}

export async function uploadProfilePhoto(userId, file) {
  const ext  = file.name?.split('.').pop() || 'jpg'
  const path = `avatars/${userId}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('profiles')
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true })
  if (upErr) throw upErr
  const { data } = supabase.storage.from('profiles').getPublicUrl(path)
  return data.publicUrl
}

export async function updateProfilePhoto(userId, photoUrl) {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: photoUrl })
    .eq('id', userId)
  if (error) throw error
}

export async function getAttendanceByStudent(studentId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}
