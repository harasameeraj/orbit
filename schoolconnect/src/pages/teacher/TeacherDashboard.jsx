import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { CheckSquare, Star, Megaphone, BookOpen, Clock, ChevronRight, TrendingUp, Users, AlertCircle } from 'lucide-react'

export default function TeacherDashboard() {
  const { user, profile } = useAuth()
  const { students, attendance, homework, announcements } = useData()
  const today = new Date().toISOString().split('T')[0]

  // Dynamic academic year (Indian school year: April-March)
  const nowDate = new Date()
  const acadYear = nowDate.getMonth() >= 3
    ? `${nowDate.getFullYear()}-${(nowDate.getFullYear() + 1).toString().slice(-2)}`
    : `${nowDate.getFullYear() - 1}-${nowDate.getFullYear().toString().slice(-2)}`

  const todayDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  // Check today's attendance status
  const markedToday = Object.values(attendance).some(records => records.some(r => r.date === today))
  const presentToday = Object.values(attendance).filter(records => records.some(r => r.date === today && r.status === 'present')).length

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const todayDay = days[new Date().getDay() - 1] || 'Monday'

  const { timetable } = useData()
  const todaySchedule = (timetable[todayDay] || timetable['Monday'] || [])

  return (
    <div className="animate-fade-in">
      <PageHeader />
      <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Hero banner */}
        <div style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)', borderRadius: 20, padding: '28px 32px', color: 'white', marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', opacity: .12, fontSize: 120 }}>🎓</div>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: .75, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{profile?.schools?.name || 'School'}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{todayDate}</div>
          <span style={{ background: 'rgba(255,255,255,.2)', borderRadius: 99, padding: '4px 14px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={14} /> Academic Session {acadYear}
          </span>
        </div>

        {/* Status cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
              <CheckSquare size={16} /> Attendance
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: markedToday ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
              {markedToday ? 'Marked' : 'Pending'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {markedToday ? `✓ ${presentToday}/${students.length} present` : 'Not marked yet'}
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
              <Star size={16} /> Marks
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-green)' }}>Up to date</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>All marks uploaded</div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
              <Users size={16} /> Student Presence
            </div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{presentToday}/{students.length}</div>
            <div style={{ marginTop: 8 }}>
              <div className="progress-bar">
                <div className="progress-fill progress-green" style={{ width: `${students.length > 0 ? (presentToday / students.length) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Link to="/teacher/attendance" className="btn btn-primary" style={{ justifyContent: 'center', padding: '14px' }}>
              <CheckSquare size={18} /> Mark Attendance
            </Link>
            <Link to="/teacher/marks" className="btn btn-outline" style={{ justifyContent: 'center', padding: '14px' }}>
              <Star size={18} /> Upload Marks
            </Link>
            <PostAnnouncementBtn announcements={announcements} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Today's Schedule */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Today's Schedule</h2>
              <span style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, cursor: 'pointer' }}>View Full Timetable →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todaySchedule.length === 0 ? (
                <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No periods scheduled for today
                </div>
              ) : todaySchedule.map((period, i) => {
                // Mark current period as active based on current time
                const now = new Date()
                const nowMins = now.getHours() * 60 + now.getMinutes()
                const [ph, pm] = (period.time || '00:00').split(':').map(Number)
                const periodStart = ph * 60 + pm
                const periodEnd = periodStart + 40
                const isActive = nowMins >= periodStart && nowMins < periodEnd
                return (
                  <div key={i} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>{period.time}</div>
                      <div style={{ width: 2, height: 36, background: isActive ? 'var(--accent-green)' : 'var(--border)', borderRadius: 1 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{period.subject}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{period.topic || period.profiles?.name || ''}</div>
                      </div>
                    </div>
                    <span className={`badge ${isActive ? 'badge-green' : 'badge-brand'}`} style={{ fontSize: 11 }}>
                      {isActive ? 'ACTIVE' : 'UPCOMING'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Homework */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Homework</h2>
              <Link to="/teacher/marks" style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>+ Post New</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {homework.length === 0 ? (
                <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No homework posted yet
                </div>
              ) : homework.slice(0, 3).map(hw => {
                const dueDate = hw.due_date || hw.dueDate || ''
                const isPastDue = dueDate && new Date(dueDate) < new Date()
                const statusLabel = isPastDue ? 'Past Due' : 'Active'
                const statusClass = isPastDue ? 'badge-amber' : 'badge-green'
                return (
                  <div key={hw.id} className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hw.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hw.subject} • Due {dueDate ? new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</div>
                      </div>
                      <span className={`badge ${statusClass}`} style={{ fontSize: 11, flexShrink: 0 }}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Dynamic Alerts */}
            {homework.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${announcements.length > 0 ? 'var(--accent-green)' : 'var(--accent-amber)'}`, borderRadius: '0 12px 12px 0' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertCircle size={16} color={announcements.length > 0 ? 'var(--accent-green)' : 'var(--accent-amber)'} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{homework.length} homework assigned</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{announcements.length} announcement{announcements.length !== 1 ? 's' : ''} posted</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PostAnnouncementBtn() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const { addAnnouncement } = useData()

  const handlePost = async () => {
    if (!text.trim()) return
    try {
      await addAnnouncement({ title: text, body: text })
    } catch (e) {
      console.error('Announcement failed:', e)
    }
    setText('')
    setOpen(false)
  }

  return (
    <>
      <button className="btn btn-ghost" style={{ justifyContent: 'center', padding: '14px' }} onClick={() => setOpen(true)}>
        <Megaphone size={18} /> Post Announcement
      </button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setOpen(false)}>
          <div className="card-lg" style={{ padding: 28, width: 440, background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Post Announcement</h3>
            <textarea className="form-input form-textarea" placeholder="Write your announcement to Class 10-A parents..." value={text} onChange={e => setText(e.target.value)} rows={4} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-primary btn-full" onClick={handlePost}>Post to All Parents</button>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
