import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ─── Config ──────────────────────────────────────────────────────────────────
// Reads from .env via react-native-dotenv or falls back to hardcoded values.
// In production, these would come from app config / EAS secrets.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase env vars missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env'
  );
}

// ─── Client with AsyncStorage for session persistence ────────────────────────
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // important for React Native
    },
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, schools(*), teacher_classes(class_id, subject, is_class_teacher, classes(id, name, grade, section))')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Students ─────────────────────────────────────────────────────────────────

export async function getStudentsByClass(classId) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .order('roll_no');
  if (error) throw error;
  return data;
}

export async function getStudentProfile(studentId) {
  const { data, error } = await supabase
    .from('students')
    .select(`*, classes(name, grade, section), parent_students(profiles(id, name, phone))`)
    .eq('id', studentId)
    .single();
  if (error) throw error;
  return data;
}

export async function getAllStudents(schoolId) {
  const { data, error } = await supabase
    .from('students')
    .select('*, classes(name)')
    .eq('school_id', schoolId)
    .order('name');
  if (error) throw error;
  return data;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendanceByDate(classId, date) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, students(name, roll_no)')
    .eq('class_id', classId)
    .eq('date', date);
  if (error) throw error;
  return data;
}

export async function getStudentAttendance(studentId, fromDate, toDate) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function submitClassAttendance(records) {
  const { error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'school_id,student_id,date' });
  if (error) throw error;
}

// ─── Marks ────────────────────────────────────────────────────────────────────

export async function getMarksByStudent(studentId) {
  const { data, error } = await supabase
    .from('marks')
    .select('*')
    .eq('student_id', studentId)
    .eq('published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMarksByClass(classId, subject, examType) {
  const { data, error } = await supabase
    .from('marks')
    .select('*, students(name, roll_no)')
    .eq('class_id', classId)
    .eq('subject', subject)
    .eq('exam_type', examType);
  if (error) throw error;
  return data;
}

export async function upsertMarks(records) {
  const { error } = await supabase
    .from('marks')
    .upsert(records, { onConflict: 'school_id,student_id,subject,exam_type' });
  if (error) throw error;
}

export async function publishMarks(classId, subject, examType) {
  const { error } = await supabase
    .from('marks')
    .update({ published: true })
    .eq('class_id', classId)
    .eq('subject', subject)
    .eq('exam_type', examType);
  if (error) throw error;
}

// ─── Homework ─────────────────────────────────────────────────────────────────

export async function getHomeworkByClass(classId) {
  const { data, error } = await supabase
    .from('homework')
    .select('*, profiles(name)')
    .eq('class_id', classId)
    .eq('is_draft', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createHomework(hw) {
  const { data, error } = await supabase
    .from('homework')
    .insert(hw)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Behaviour Logs ───────────────────────────────────────────────────────────

export async function getBehaviourLogs(studentId, date) {
  let query = supabase
    .from('behaviour_logs')
    .select('*, profiles(name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (date) query = query.eq('date', date);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function addBehaviourLog(log) {
  const { data, error } = await supabase
    .from('behaviour_logs')
    .insert(log)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Announcements ────────────────────────────────────────────────────────────

export async function getAnnouncements(classId) {
  const { data, error } = await supabase
    .from('announcements')
    .select('*, profiles(name)')
    .or(`class_id.eq.${classId},class_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}

export async function createAnnouncement(ann) {
  const { data, error } = await supabase
    .from('announcements')
    .insert(ann)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getOrCreateThread(parentId, teacherId, studentId, schoolId) {
  let { data } = await supabase
    .from('message_threads')
    .select('*')
    .eq('parent_id', parentId)
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (!data) {
    const { data: created, error } = await supabase
      .from('message_threads')
      .insert({ parent_id: parentId, teacher_id: teacherId, student_id: studentId, school_id: schoolId })
      .select()
      .single();
    if (error) throw error;
    data = created;
  }
  return data;
}

export async function getMessages(threadId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles(name, role)')
    .eq('thread_id', threadId)
    .order('sent_at');
  if (error) throw error;
  return data;
}

export async function sendMessage(threadId, senderId, text, schoolId) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ thread_id: threadId, sender_id: senderId, text, school_id: schoolId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToMessages(threadId, callback) {
  return supabase
    .channel(`thread:${threadId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `thread_id=eq.${threadId}`,
    }, payload => callback(payload.new))
    .subscribe();
}

// ─── Notices ──────────────────────────────────────────────────────────────────

export async function getNotices(schoolId, adminView = false) {
  let query = supabase
    .from('notices')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  if (!adminView) query = query.eq('is_visible', true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ─── Timetable ────────────────────────────────────────────────────────────────

export async function getTimetable(classId) {
  const { data, error } = await supabase
    .from('timetable')
    .select('*, profiles(name)')
    .eq('class_id', classId)
    .order('day_of_week')
    .order('start_time');
  if (error) throw error;
  return data;
}

// ─── Fees ─────────────────────────────────────────────────────────────────────

export async function getStudentFees(studentId) {
  const { data, error } = await supabase
    .from('student_fees')
    .select('*, fee_structures(id, name, amount, frequency)')
    .eq('student_id', studentId)
    .order('due_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Teachers by Class ───────────────────────────────────────────────────────

export async function getTeachersByClass(classId) {
  const { data, error } = await supabase
    .from('teacher_classes')
    .select('profiles(id, name, subject_specialty, avatar_url)')
    .eq('class_id', classId);
  if (error) throw error;
  return (data || []).map(r => r.profiles).filter(Boolean);
}

// ─── FCM Token ────────────────────────────────────────────────────────────────

export async function saveFcmToken(userId, token) {
  const { error } = await supabase
    .from('profiles')
    .update({ fcm_token: token })
    .eq('id', userId);
  if (error) throw error;
}

// ─── Profile Photo ────────────────────────────────────────────────────────────

export async function updateProfilePhoto(userId, photoUrl) {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: photoUrl })
    .eq('id', userId);
  if (error) throw error;
}
