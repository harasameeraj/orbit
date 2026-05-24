import { Link } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { CheckCircle2, Star, BookOpen, Calendar, Megaphone, MessageCircle, XCircle, Clock } from 'lucide-react'

export default function ParentDashboard() {
  const { homework, announcements, behaviourLogs, attendance, marks, students } = useData()
  const { user } = useAuth()

  const student = students[0] || {}
  const studentId = student.id
  const firstName = student.name?.split(' ')[0] || user?.email?.split('@')[0] || 'your child'

  // Today's attendance from DB (keyed by student ID)
  const today = new Date().toISOString().split('T')[0]
  const todayAttRecords = studentId ? (attendance[studentId] || []) : []
  const todayAtt = todayAttRecords.find(r => r.date === today)
  const attStatus = todayAtt?.status // 'present' | 'absent' | 'late' | undefined

  // Latest mark from any subject
  const allMarks = studentId ? (marks[studentId] || []) : []
  const latestExam = allMarks.flatMap(s => s.exams || []).slice(-1)[0]

  // Latest homework
  const latestHw = homework[0]

  // Latest behaviour log
  const latestLog = behaviourLogs[0]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  const attColor = attStatus === 'present' ? 'var(--accent-green)'
    : attStatus === 'absent' ? '#dc2626'
    : attStatus === 'late' ? 'var(--accent-amber)'
    : 'var(--text-muted)'
  const attBg = attStatus === 'present' ? 'var(--accent-green-light)'
    : attStatus === 'absent' ? '#fff1f2'
    : attStatus === 'late' ? 'var(--accent-amber-light)'
    : 'var(--surface-2)'
  const AttIcon = attStatus === 'absent' ? XCircle : attStatus === 'late' ? Clock : CheckCircle2

  return (
    <div className="animate-fade-in">
      <PageHeader />
      <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>

        {/* Greeting */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{greeting}!</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Here is a quick look at {firstName}'s day so far.</p>
        </div>

        {/* Daily Report Summary */}
        <div className="card-lg" style={{ padding: 24, marginBottom: 24, borderLeft: '4px solid var(--brand)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Star size={18} color="var(--brand)" />
              <span style={{ fontWeight: 700, fontSize: 16 }}>Daily Report Summary</span>
            </div>
            <span className="badge badge-green">Today</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Attendance */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: attBg, borderRadius: 10 }}>
              <div style={{ width: 36, height: 36, background: attBg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${attColor}30` }}>
                <AttIcon size={18} color={attColor} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5 }}>Attendance</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: attColor, textTransform: 'capitalize' }}>
                  {attStatus || 'Not Marked'}
                </div>
                {todayAtt?.marked_at && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Marked at {new Date(todayAtt.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>

            {/* Latest Score */}
            {latestExam ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 10 }}>
                <div style={{ width: 36, height: 36, background: 'var(--brand-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={18} color="var(--brand)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5 }}>Latest Score</div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{latestExam.score}/{latestExam.max}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{latestExam.name}</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 10 }}>
                <div style={{ width: 36, height: 36, background: 'var(--brand-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={18} color="var(--brand)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5 }}>Latest Score</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No marks published yet</div>
                </div>
              </div>
            )}

            {/* Homework */}
            {latestHw && (
              <div style={{ padding: '12px 16px', background: 'var(--accent-amber-light)', borderRadius: 10, border: '1px dashed var(--accent-amber)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <BookOpen size={18} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Upcoming Homework</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>"{latestHw.title}"</div>
                    <div style={{ fontSize: 12, color: 'var(--accent-amber)', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} /> Due {latestHw.due_date || latestHw.dueDate}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Quick Access</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'View Attendance Record', Icon: CheckCircle2, to: '/parent/attendance' },
              { label: 'View Marks & Progress', Icon: Star, to: '/parent/marks' },
              { label: 'Message Teacher', Icon: MessageCircle, to: '/parent/chat' },
            ].map(({ label, Icon, to }) => (
              <Link key={label} to={to} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 4px', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={18} color="var(--text-muted)" />
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{label}</span>
                </div>
                <span style={{ color: 'var(--text-muted)' }}>›</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Announcement */}
        {announcements[0] && (
          <div style={{ background: 'var(--brand)', borderRadius: 16, padding: 20, marginBottom: 24, color: 'white' }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: .75, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Megaphone size={14} /> ANNOUNCEMENT
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{announcements[0].title}</div>
            {announcements[0].body && (
              <div style={{ fontSize: 13, opacity: .85, marginBottom: 8 }}>{announcements[0].body}</div>
            )}
          </div>
        )}

        {/* Latest behaviour log / teacher remark */}
        {latestLog && (
          <div className="card-lg" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div className="avatar" style={{ background: 'var(--brand-light)', color: 'var(--brand)', fontWeight: 800 }}>
                {latestLog.teacher_name?.charAt(0) || 'T'}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{latestLog.teacher_name || 'Class Teacher'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {latestLog.created_at ? new Date(latestLog.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 16 }}>
              "{latestLog.note}"
            </p>
            <Link to="/parent/chat" className="btn btn-primary btn-sm">
              <MessageCircle size={15} /> Message Teacher
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
