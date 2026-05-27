import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase, getSchoolStats, getCalendarEvents, getWeeklyAttendanceStats, getFeeStats, getClassesBySchool } from '../../lib/supabase.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { Users, GraduationCap, CheckCircle2, TrendingUp, Bell, Calendar, Plus, ChevronRight, IndianRupee, BookOpen, School } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const WEEKLY_ATT_DEFAULT = [
  { day: 'Mon', present: 0, late: 0 },
  { day: 'Tue', present: 0, late: 0 },
  { day: 'Wed', present: 0, late: 0 },
  { day: 'Thu', present: 0, late: 0 },
  { day: 'Fri', present: 0, late: 0 },
]

export default function AdminDashboard() {
  const { students, notices, announcements } = useData()
  const { profile } = useAuth()
  const [feeMsg, setFeeMsg] = useState('')
  const [feeSent, setFeeSent] = useState(false)
  const [feeSending, setFeeSending] = useState(false)
  const [stats, setStats] = useState({ totalStudents: null, totalTeachers: null, attendancePct: null, attendanceMarked: false })
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [weeklyAtt, setWeeklyAtt] = useState(WEEKLY_ATT_DEFAULT)
  const [feeStats, setFeeStats] = useState(null)
  const [totalClasses, setTotalClasses] = useState(null)

  // Compute current academic session dynamically
  const now = new Date()
  const acadYear = now.getMonth() >= 3
    ? `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)}`
    : `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(-2)}`

  const schoolName = profile?.schools?.name || 'School'

  useEffect(() => {
    if (!profile?.school_id) return
    getSchoolStats(profile.school_id)
      .then(s => setStats(s))
      .catch(console.warn)
    const today = new Date().toISOString().split('T')[0]
    const inThreeMonths = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
    getCalendarEvents(profile.school_id, today, inThreeMonths)
      .then(evs => setUpcomingEvents((evs || []).slice(0, 4)))
      .catch(console.warn)
    getWeeklyAttendanceStats(profile.school_id)
      .then(rows => setWeeklyAtt(rows))
      .catch(console.warn)
    getFeeStats(profile.school_id)
      .then(fs => setFeeStats(fs))
      .catch(console.warn)
    getClassesBySchool(profile.school_id)
      .then(cls => setTotalClasses(cls?.length ?? null))
      .catch(console.warn)
  }, [profile?.school_id])

  const sendFeeReminder = async () => {
    if (!feeMsg.trim()) return
    setFeeSending(true)
    try {
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'fee_reminder',
          title: 'Fee Reminder',
          body: feeMsg,
          school_id: profile?.school_id,
        }
      })
      setFeeSent(true)
      setFeeMsg('')
      setTimeout(() => setFeeSent(false), 3000)
    } catch (err) {
      console.error('Fee reminder failed:', err)
    } finally {
      setFeeSending(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Admin Dashboard" subtitle={schoolName} />
      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* KPI Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { Icon: Users, label: 'Total Students', value: stats.totalStudents !== null ? stats.totalStudents.toLocaleString('en-IN') : '—', color: '#7c3aed', bg: '#f5f3ff' },
            { Icon: GraduationCap, label: 'Total Teachers', value: stats.totalTeachers !== null ? stats.totalTeachers.toString() : '—', color: '#0891b2', bg: '#ecfeff' },
            { Icon: CheckCircle2, label: 'Attendance Today', value: stats.attendanceMarked ? `${stats.attendancePct}%` : 'Not yet', color: 'var(--accent-green)', bg: 'var(--accent-green-light)' },
          ].map(({ Icon, label, value, color, bg }) => (
            <div key={label} className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, background: bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={24} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Weekly Attendance Chart */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Weekly Attendance Trends</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--brand)' }} /> Present</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-amber)' }} /> Late</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyAtt} barSize={20} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="present" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" fill="var(--accent-amber)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Fee Reminder */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: .5, marginBottom: 4 }}>FEE REMINDERS</div>
                <div style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={18} color="var(--brand)" /> Send Reminder
                </div>
              </div>
              {feeStats && feeStats.totalCount > 0 && (
                <span className="badge badge-green">{feeStats.paidCount}/{feeStats.totalCount} Paid</span>
              )}
            </div>
            {feeStats ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                ₹{feeStats.collected.toLocaleString('en-IN')} collected • ₹{feeStats.pending.toLocaleString('en-IN')} pending
                {feeStats.overdue > 0 && <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}> • {feeStats.overdue} overdue</span>}
              </p>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Send fee reminders to all parents at once</p>
            )}
            {feeSent && <div style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)', padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>✓ Fee reminders sent to all parents!</div>}
            <textarea className="form-input form-textarea" rows={3} placeholder="Enter fee reminder message..." value={feeMsg} onChange={e => setFeeMsg(e.target.value)} style={{ marginBottom: 12, fontSize: 13 }} />
            <button className="btn btn-primary" onClick={sendFeeReminder} disabled={feeSending}>{feeSending ? 'Sending…' : 'Send Reminder'}</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Academic Calendar */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: .5, marginBottom: 4 }}>UPCOMING</div>
                <div style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={18} color="var(--brand)" /> Academic Calendar
                </div>
              </div>
            </div>
            {upcomingEvents.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>No upcoming events — add some in Academic Calendar</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingEvents.map(ev => {
                const colors = { meeting: 'var(--accent-blue)', event: 'var(--accent-green)', exam: 'var(--accent-amber)', holiday: '#7c3aed', sports: '#e11d48' }
                const bgs = { meeting: 'var(--accent-blue-light)', event: 'var(--accent-green-light)', exam: 'var(--accent-amber-light)', holiday: '#f5f3ff', sports: '#fff1f2' }
                const evDate = new Date(ev.event_date)
                const dateLabel = evDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                const evType = ev.type || 'event'
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                    <div style={{ width: 48, padding: '4px 0', background: bgs[evType] || bgs.event, borderRadius: 6, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: colors[evType] || colors.event }}>{dateLabel}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name || ev.title}</span>
                  </div>
                )
              })}
            </div>
            <Link to="/admin/calendar" className="btn btn-outline btn-full" style={{ marginTop: 16, justifyContent: 'center' }}>View Full Schedule</Link>
          </div>

          {/* Recent Notices */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Recent Notices</div>
              <Link to="/admin/noticeboard" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
                <Plus size={14} /> Add New
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {notices.slice(0, 4).map(notice => (
                <div key={notice.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{notice.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {(notice.body || '').slice(0, 55)}{(notice.body || '').length > 55 ? '…' : ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{notice.created_at ? new Date(notice.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* School Overview */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>School Overview</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Total Classes', value: totalClasses !== null ? totalClasses : '—', color: '#1a3a6b', Icon: School },
              { label: 'Academic Year', value: acadYear, color: '#0891b2', Icon: BookOpen },
              { label: 'Fee Collection', value: feeStats ? `${Math.round((feeStats.collected / (feeStats.total || 1)) * 100)}%` : '—', color: '#7c3aed', Icon: IndianRupee },
              { label: 'Active Notices', value: notices.length, color: '#16a34a', Icon: Bell },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} style={{ background: color, borderRadius: 14, padding: '20px 16px', color: 'white', position: 'relative', overflow: 'hidden', minHeight: 100 }}>
                <div style={{ position: 'absolute', right: 12, bottom: 8, opacity: .15 }}><Icon size={48} /></div>
                <div style={{ fontWeight: 700, fontSize: 14, position: 'relative', marginBottom: 8 }}>{label}</div>
                <div style={{ fontWeight: 900, fontSize: 24, position: 'relative' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
