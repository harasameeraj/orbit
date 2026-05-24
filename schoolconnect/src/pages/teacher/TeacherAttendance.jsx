import { useState, useEffect } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { getAttendanceByDate } from '../../lib/supabase.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { CheckCircle2, XCircle, CheckCheck, Save, Loader2 } from 'lucide-react'

export default function TeacherAttendance() {
  const { students, markAttendance, classId } = useData()
  const today = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const [statuses, setStatuses] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Sync statuses state and fetch existing attendance from database on load
  useEffect(() => {
    if (!students || students.length === 0) return

    const loadTodayAttendance = async () => {
      setLoading(true)
      try {
        const records = classId ? await getAttendanceByDate(classId, today) : []
        const nextStatuses = {}
        
        // Default all students to present
        students.forEach(s => {
          nextStatuses[s.id] = 'present'
        })

        // Overlay with database records if they exist
        if (records && records.length > 0) {
          records.forEach(r => {
            if (nextStatuses[r.student_id]) {
              nextStatuses[r.student_id] = r.status
            }
          })
        }
        setStatuses(nextStatuses)
      } catch (err) {
        console.error('Failed to load today\'s attendance:', err)
      }
      setLoading(false)
    }

    loadTodayAttendance()
  }, [students, classId, today])

  const toggle = (id, status) => setStatuses(prev => ({ ...prev, [id]: status }))
  const markAll = () => {
    const nextStatuses = { ...statuses }
    students.forEach(s => { nextStatuses[s.id] = 'present' })
    setStatuses(nextStatuses)
  }

  const handleSubmit = async () => {
    const records = students.map(s => ({ studentId: s.id, status: statuses[s.id] }))
    try {
      await markAttendance(records, today)
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    } catch (e) {
      console.error('Attendance submit failed:', e)
    }
  }

  const presentCount = Object.values(statuses).filter(s => s === 'present').length
  const absentCount = Object.values(statuses).filter(s => s === 'absent').length

  return (
    <div className="animate-fade-in">
      <PageHeader title="Attendance" subtitle={todayLabel} />
      <div style={{ padding: '28px 32px', maxWidth: 800, margin: '0 auto' }}>

        {submitted && (
          <div style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)', padding: '14px 20px', borderRadius: 10, marginBottom: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} /> Attendance submitted successfully!
          </div>
        )}

        {/* Stats + Mark All */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-green)' }}>{presentCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Present</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-red)' }}>{absentCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Absent</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{students.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Total</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={markAll}>
            <CheckCheck size={16} /> Mark All Present
          </button>
        </div>

        {/* Student list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0', gap: 10, color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Loading today's attendance...</span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {students.map((student, i) => {
                const status = statuses[student.id]
                return (
                  <div key={student.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: `4px solid ${status === 'present' ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
                    <div style={{ width: 32, height: 32, background: 'var(--brand-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--brand)', fontSize: 14, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{student.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Roll No: {student.rollNo || student.roll_no}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => toggle(student.id, 'present')} style={{
                        padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${status === 'present' ? 'var(--accent-green)' : 'var(--border)'}`,
                        background: status === 'present' ? 'var(--accent-green-light)' : 'transparent',
                        color: status === 'present' ? 'var(--accent-green)' : 'var(--text-muted)',
                        cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s', fontFamily: 'var(--font)'
                      }}>
                        <CheckCircle2 size={15} /> Present
                      </button>
                      <button onClick={() => toggle(student.id, 'absent')} style={{
                        padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${status === 'absent' ? 'var(--accent-red)' : 'var(--border)'}`,
                        background: status === 'absent' ? 'var(--accent-red-light)' : 'transparent',
                        color: status === 'absent' ? 'var(--accent-red)' : 'var(--text-muted)',
                        cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s', fontFamily: 'var(--font)'
                      }}>
                        <XCircle size={15} /> Absent
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={handleSubmit}>
              <Save size={18} /> Submit Attendance →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
