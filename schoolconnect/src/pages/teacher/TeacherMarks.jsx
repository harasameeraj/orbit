import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { Upload, Save, Plus, Loader2 } from 'lucide-react'
import { upsertMarks, publishMarks } from '../../lib/supabase.js'
import { supabase } from '../../lib/supabase.js'

const SUBJECTS = ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi', 'Physical Education']
const EXAM_TYPES = ['Unit Test 1', 'Unit Test 2', 'Unit Test 3', 'Mid Term', 'Final Exam', 'Assignment']

export default function TeacherMarks() {
  const { user, profile } = useAuth()
  const { students, addHomework } = useData()

  const [tab, setTab] = useState('marks')

  // Marks state
  const [subject, setSubject] = useState('Mathematics')
  const [examType, setExamType] = useState('Unit Test 1')
  const [scores, setScores] = useState(() => Object.fromEntries(students.map(s => [s.id, ''])))
  const [savingDraft, setSavingDraft] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [marksMsg, setMarksMsg] = useState({ type: '', text: '' })

  // Homework state
  const [hwTitle, setHwTitle] = useState('')
  const [hwSubject, setHwSubject] = useState('Mathematics')
  const [hwDue, setHwDue] = useState('')
  const [hwDesc, setHwDesc] = useState('')
  const [hwLoading, setHwLoading] = useState(false)
  const [hwMsg, setHwMsg] = useState({ type: '', text: '' })

  // Reset scores when subject/exam changes
  const handleSubjectChange = (val) => {
    setSubject(val)
    setScores(Object.fromEntries(students.map(s => [s.id, ''])))
    setMarksMsg({ type: '', text: '' })
  }

  const classId = profile?.teacher_classes?.[0]?.class_id
  const schoolId = profile?.school_id

  // Build upsert records from current scores
  const buildRecords = (published) =>
    students
      .filter(s => scores[s.id] !== '')
      .map(s => ({
        school_id: schoolId,
        student_id: s.id,
        class_id: s.class_id || classId,
        teacher_id: user.id,
        subject,
        exam_type: examType,
        score: parseInt(scores[s.id]) || 0,
        max_score: 100,
        published,
      }))

  const handleSaveDraft = async () => {
    const records = buildRecords(false)
    if (!records.length) {
      setMarksMsg({ type: 'error', text: 'Enter at least one score before saving.' })
      return
    }
    setSavingDraft(true)
    try {
      await upsertMarks(records)
      setMarksMsg({ type: 'success', text: '✓ Draft saved. Marks are not visible to parents yet.' })
    } catch (e) {
      setMarksMsg({ type: 'error', text: 'Save failed: ' + e.message })
    }
    setSavingDraft(false)
  }

  const handlePublish = async () => {
    const records = buildRecords(true)
    if (!records.length) {
      setMarksMsg({ type: 'error', text: 'Enter at least one score before publishing.' })
      return
    }
    setPublishing(true)
    try {
      await upsertMarks(records)
      if (classId) await publishMarks(classId, subject, examType)

      // Fire push notification to parents via Edge Function
      supabase.functions.invoke('send-notification', {
        body: {
          type: 'marks',
          title: `${subject} marks published`,
          body: `${examType} marks for ${subject} are now available. Check your child's performance.`,
          school_id: schoolId,
          class_id: classId,
        }
      }).catch(console.warn)

      setMarksMsg({ type: 'success', text: '✓ Marks published! Parents have been notified via push notification.' })
    } catch (e) {
      setMarksMsg({ type: 'error', text: 'Publish failed: ' + e.message })
    }
    setPublishing(false)
  }

  const handlePostHw = async () => {
    if (!hwTitle.trim()) {
      setHwMsg({ type: 'error', text: 'Please enter a homework title.' })
      return
    }
    setHwLoading(true)
    setHwMsg({ type: '', text: '' })
    try {
      await addHomework({
        subject: hwSubject,
        title: hwTitle,
        description: hwDesc,
        due_date: hwDue || null,
        is_draft: false,
      })
      setHwTitle(''); setHwDesc(''); setHwDue('')
      setHwMsg({ type: 'success', text: '✓ Homework posted! All parents in your class have been notified.' })
    } catch (e) {
      setHwMsg({ type: 'error', text: 'Failed: ' + e.message })
    }
    setHwLoading(false)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Marks & Homework" />
      <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>

        <div className="tabs" style={{ marginBottom: 24 }}>
          <button className={`tab ${tab === 'marks' ? 'active' : ''}`} onClick={() => setTab('marks')}>Upload Marks</button>
          <button className={`tab ${tab === 'homework' ? 'active' : ''}`} onClick={() => setTab('homework')}>Post Homework</button>
        </div>

        {/* ── MARKS TAB ── */}
        {tab === 'marks' && (
          <>
            {marksMsg.text && (
              <div style={{ background: marksMsg.type === 'success' ? 'var(--accent-green-light)' : 'var(--accent-red-light)', color: marksMsg.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', padding: '14px 20px', borderRadius: 10, marginBottom: 20, fontWeight: 600 }}>
                {marksMsg.text}
              </div>
            )}

            {/* Subject + Exam selectors */}
            <div className="card" style={{ padding: 20, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Select Subject</label>
                <select className="form-input form-select" value={subject} onChange={e => handleSubjectChange(e.target.value)}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Exam Type</label>
                <select className="form-input form-select" value={examType} onChange={e => setExamType(e.target.value)}>
                  {EXAM_TYPES.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
            </div>

            {/* Student score entry */}
            <div className="card" style={{ overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Student Records</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Showing {students.length} Students
                </span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {students.length === 0 ? (
                  <div className="empty-state">No students found in your class</div>
                ) : students.map(student => {
                  const score = scores[student.id] ?? ''
                  const numScore = parseInt(score)
                  const color = score === '' ? 'var(--text-muted)' : numScore >= 80 ? 'var(--accent-green)' : numScore >= 50 ? 'var(--brand)' : 'var(--accent-red)'
                  return (
                    <div key={student.id} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--border)' }}>
                      <div className="avatar avatar-sm" style={{ background: 'var(--brand-light)', color: 'var(--brand)', fontWeight: 700 }}>
                        {(student.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{student.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Roll No: {student.roll_no || student.rollNo || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number" min="0" max="100"
                          value={score}
                          onChange={e => {
                            const val = e.target.value
                            if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 100)) {
                              setScores(prev => ({ ...prev, [student.id]: val }))
                            }
                          }}
                          placeholder="—"
                          style={{ width: 72, padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 16, fontWeight: 700, color, textAlign: 'center', outline: 'none', fontFamily: 'var(--font)', background: 'var(--surface)', transition: 'border-color .15s' }}
                          onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>/100</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost btn-lg" style={{ flex: 1 }} onClick={handleSaveDraft} disabled={savingDraft || publishing}>
                {savingDraft ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
              <button className="btn btn-success btn-lg" style={{ flex: 2, background: 'var(--accent-green)', color: 'white', border: 'none' }} onClick={handlePublish} disabled={publishing || savingDraft}>
                {publishing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={18} />}
                {publishing ? 'Publishing...' : 'Publish Marks'}
              </button>
            </div>
          </>
        )}

        {/* ── HOMEWORK TAB ── */}
        {tab === 'homework' && (
          <>
            {hwMsg.text && (
              <div style={{ background: hwMsg.type === 'success' ? 'var(--accent-green-light)' : 'var(--accent-red-light)', color: hwMsg.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', padding: '14px 20px', borderRadius: 10, marginBottom: 20, fontWeight: 600 }}>
                {hwMsg.text}
              </div>
            )}
            <div className="card" style={{ padding: 28 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Academic Clarity / Assignments</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Create Homework</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Homework Title *</label>
                  <input className="form-input" placeholder="e.g. Quadratic Equations Practice" value={hwTitle} onChange={e => setHwTitle(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Select Subject</label>
                    <select className="form-input form-select" value={hwSubject} onChange={e => setHwSubject(e.target.value)}>
                      {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input className="form-input" type="date" value={hwDue} onChange={e => setHwDue(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description & Instructions</label>
                  <textarea className="form-input form-textarea" placeholder="Describe the assignment in detail..." value={hwDesc} onChange={e => setHwDesc(e.target.value)} rows={5} />
                </div>
                <div style={{ background: 'var(--accent-green-light)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-green)', marginBottom: 4 }}>Teacher's Note</div>
                  <div style={{ fontSize: 13, color: 'var(--accent-green)', opacity: .85 }}>
                    Homework posted here will be instantly notified to all parents in your class.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-primary btn-full btn-lg" onClick={handlePostHw} disabled={hwLoading}>
                    {hwLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={18} />}
                    {hwLoading ? 'Posting...' : 'Post Homework'}
                  </button>
                  <button className="btn btn-ghost btn-lg" disabled={hwLoading}>
                    <Save size={18} /> Save as Draft
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
