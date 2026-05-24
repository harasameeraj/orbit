import { useState, useMemo } from 'react'
import { useData } from '../../context/DataContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

const DAYS_SHORT  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS      = ['January','February','March','April','May','June','July','August','September','October','November','December']

const STATUS_META = {
  present: { color: 'var(--accent-green)',  bg: 'var(--accent-green-light)',  dot: '#22c55e', label: 'Present' },
  absent:  { color: 'var(--accent-red)',    bg: 'var(--accent-red-light)',    dot: '#ef4444', label: 'Absent'  },
  late:    { color: 'var(--accent-amber)',  bg: 'var(--accent-amber-light)',  dot: '#f59e0b', label: 'Late'    },
  holiday: { color: 'var(--brand)',         bg: 'var(--brand-light)',         dot: '#1a3a6b', label: 'Holiday' },
}

export default function ParentAttendance() {
  const { attendance, students } = useData()

  const student   = students?.[0]
  const studentId = student?.id
  const records   = (studentId ? attendance[studentId] : null) || []

  const today  = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year,  setYear]  = useState(today.getFullYear())

  // Navigate months, clamped to reasonable range
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Calendar data for current month view
  const firstDayOfWeek = new Date(year, month, 1).getDay()  // 0 = Sunday
  const daysInMonth    = new Date(year, month + 1, 0).getDate()

  // Build date → status map
  const statusMap = useMemo(() => {
    const map = {}
    records.forEach(r => { if (r.date) map[r.date] = r })
    return map
  }, [records])

  const getRecord = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return statusMap[dateStr] || null
  }

  // Summary stats for THIS month
  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
    const monthRecs = records.filter(r => r.date?.startsWith(prefix))
    return {
      present: monthRecs.filter(r => r.status === 'present').length,
      absent:  monthRecs.filter(r => r.status === 'absent').length,
      late:    monthRecs.filter(r => r.status === 'late').length,
      total:   monthRecs.length,
    }
  }, [records, month, year])

  const pct = monthStats.total > 0
    ? Math.round(((monthStats.present + monthStats.late) / monthStats.total) * 100)
    : null

  // Overall stats (all records)
  const overallStats = useMemo(() => {
    const total   = records.length
    const present = records.filter(r => r.status === 'present').length
    const late    = records.filter(r => r.status === 'late').length
    return { total, present, late, pct: total > 0 ? Math.round(((present + late) / total) * 100) : null }
  }, [records])

  // Recent 8 records newest first
  const recentRecs = [...records].sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 8)

  const isToday = (day) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }
  const isFuture = (day) => {
    const d = new Date(year, month, day)
    d.setHours(0, 0, 0, 0)
    const t = new Date(); t.setHours(0, 0, 0, 0)
    return d > t
  }
  const isWeekend = (day) => {
    const dow = new Date(year, month, day).getDay()
    return dow === 0 || dow === 6
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Attendance" />
      <div style={{ padding: '28px 32px', maxWidth: 740, margin: '0 auto' }}>

        {/* Student info card */}
        {student && (
          <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            {student.photo_url
              ? <img src={student.photo_url} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover' }} />
              : <div className="avatar avatar-lg" style={{ background: 'var(--brand-light)', color: 'var(--brand)', fontWeight: 800 }}>{student.name?.charAt(0)}</div>
            }
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{student.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {student.classes?.name || student.class_id} • Roll No. {student.roll_no}
              </div>
            </div>
            {overallStats.pct != null && (
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: overallStats.pct >= 75 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{overallStats.pct}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>OVERALL</div>
              </div>
            )}
          </div>
        )}

        {/* Monthly summary banner */}
        <div style={{ background: 'var(--brand)', borderRadius: 16, padding: '24px 28px', color: 'white', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: .75, marginBottom: 6 }}>
            {MONTHS[month]} {year} — Summary
          </div>
          {pct != null ? (
            <>
              <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, marginBottom: 12 }}>{pct}%</div>
              <div className="progress-bar" style={{ background: 'rgba(255,255,255,.3)', marginBottom: 16 }}>
                <div className="progress-fill" style={{ background: 'white', width: `${pct}%` }} />
              </div>
            </>
          ) : (
            <div style={{ fontSize: 16, opacity: .8, marginBottom: 20 }}>No attendance data for this month yet</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            {[
              ['Present',  monthStats.present, '#22c55e'],
              ['Absent',   monthStats.absent,  '#ef4444'],
              ['Late',     monthStats.late,    '#f59e0b'],
              ['Recorded', monthStats.total,   'white'],
            ].map(([label, val, clr]) => (
              <div key={label}>
                <div style={{ fontSize: 10, opacity: .7, fontWeight: 600, letterSpacing: .5 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2, color: clr }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar card */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontWeight: 700, fontSize: 18 }}>{MONTHS[month]} {year}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={prevMonth} style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()) }}
                style={{ background: 'var(--brand-light)', border: 'none', borderRadius: 8, padding: '0 12px', height: 32, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font)' }}>
                Today
              </button>
              <button onClick={nextMonth} style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 4 }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ fontSize: 11, fontWeight: 700, color: d === 'Sun' || d === 'Sat' ? 'var(--accent-red)' : 'var(--text-muted)', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {/* Empty cells before first day */}
            {Array(firstDayOfWeek).fill(null).map((_, i) => <div key={`e${i}`} />)}

            {Array(daysInMonth).fill(null).map((_, i) => {
              const day    = i + 1
              const rec    = getRecord(day)
              const status = rec?.status
              const meta   = status ? STATUS_META[status] : null
              const todayFlag    = isToday(day)
              const futureFlag   = isFuture(day)
              const weekendFlag  = isWeekend(day)

              return (
                <div key={day} style={{
                  width: '100%', aspectRatio: '1', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', borderRadius: 10,
                  position: 'relative', fontSize: 13,
                  fontWeight: todayFlag ? 900 : 600,
                  background: todayFlag ? 'var(--brand)' : meta ? meta.bg : weekendFlag ? 'var(--surface-2)' : 'transparent',
                  color: todayFlag ? 'white' : weekendFlag && !meta ? 'var(--text-muted)' : 'var(--text-primary)',
                  border: todayFlag ? 'none' : '1px solid var(--border)',
                  opacity: futureFlag ? .35 : 1,
                  transition: 'all .1s',
                }}>
                  {day}
                  {status && (
                    <span style={{
                      position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                      width: 5, height: 5, borderRadius: '50%',
                      background: todayFlag ? 'rgba(255,255,255,.8)' : meta.dot,
                    }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.dot }} />
                {meta.label}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--border)' }} />
              Weekend
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {recentRecs.length > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 16 }}>Recent Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentRecs.map((rec, i) => {
                const meta = STATUS_META[rec.status] || STATUS_META.present
                const Icon = rec.status === 'present' ? CheckCircle2
                  : rec.status === 'late' ? Clock
                  : XCircle
                const dateObj = new Date(rec.date)
                const label = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < recentRecs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <Icon size={20} color={meta.color} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {rec.status === 'present' && rec.check_in_time
                          ? `Checked-in at ${rec.check_in_time}`
                          : rec.status === 'late'
                          ? `Late arrival${rec.check_in_time ? ` at ${rec.check_in_time}` : ''}`
                          : rec.reason ? `Reason: ${rec.reason}` : 'Absent'
                        }
                      </div>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {records.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <AlertTriangle size={40} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-muted)' }} />
            <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>No attendance records yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Records will appear once your child's teacher marks attendance.</div>
          </div>
        )}
      </div>
    </div>
  )
}
