import { useState, useEffect } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getBehaviourLogs } from '../../lib/supabase.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { Search, ChevronRight, Phone, Mail, MessageSquare, Clock, X,
         TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, Star } from 'lucide-react'

const REMARK_TYPES = [
  { value: 'positive',   label: 'Positive',   color: 'var(--accent-green)',  bg: 'var(--accent-green-light)' },
  { value: 'concern',    label: 'Concern',     color: 'var(--accent-amber)',  bg: 'var(--accent-amber-light)' },
  { value: 'disciplinary', label: 'Disciplinary', color: 'var(--accent-red)', bg: 'var(--accent-red-light)' },
  { value: 'academic',   label: 'Academic',    color: 'var(--brand)',         bg: 'var(--brand-light)' },
]

export default function TeacherStudents() {
  const { students, behaviourLogs, addBehaviourLog } = useData()
  const { profile } = useAuth()
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')
  const [selected, setSelected]   = useState(null)
  const [remarkText, setRemarkText] = useState('')
  const [remarkType, setRemarkType] = useState('positive')
  const [remarkSaving, setRemarkSaving] = useState(false)
  const [remarkSaved, setRemarkSaved]   = useState(false)
  const [remarkError, setRemarkError]   = useState('')
  const [studentLogs, setStudentLogs]   = useState([])
  const [loadingLogs, setLoadingLogs]   = useState(false)

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = s.name?.toLowerCase().includes(q) || s.roll_no?.toLowerCase().includes(q)
    if (filter === 'low')  return matchSearch && (s.attendance_pct ?? 100) < 80
    if (filter === 'high') return matchSearch && (s.attendance_pct ?? 0) >= 90
    return matchSearch
  })

  // Load per-student behaviour logs when modal opens
  useEffect(() => {
    if (!selected) { setStudentLogs([]); return }
    setLoadingLogs(true)
    const today = new Date().toISOString().split('T')[0]
    getBehaviourLogs(selected.id, today)
      .then(logs => setStudentLogs(logs || []))
      .catch(console.error)
      .finally(() => setLoadingLogs(false))
  }, [selected])

  const handleRemark = async () => {
    if (!remarkText.trim() || !selected) return
    setRemarkSaving(true)
    setRemarkError('')
    try {
      await addBehaviourLog({
        studentId:  selected.id,
        note:       remarkText.trim(),
        type:       remarkType,
        // teacher name comes from profile in DataContext action
      })
      setStudentLogs(prev => [{
        note: remarkText.trim(),
        type: remarkType,
        teacher_name: profile?.name || 'Teacher',
        created_at: new Date().toISOString(),
      }, ...prev])
      setRemarkText('')
      setRemarkSaved(true)
      setTimeout(() => setRemarkSaved(false), 2500)
    } catch (err) {
      console.error(err)
      setRemarkError('Failed to save. Please try again.')
    } finally {
      setRemarkSaving(false)
    }
  }

  const att = (s) => s.attendance_pct ?? s.attendance ?? null
  const attColor = (pct) => pct == null ? 'var(--text-muted)'
    : pct >= 90 ? 'var(--accent-green)'
    : pct >= 75 ? 'var(--accent-amber)'
    : 'var(--accent-red)'

  const typeInfo = (type) => REMARK_TYPES.find(t => t.value === type) || REMARK_TYPES[0]

  return (
    <div className="animate-fade-in">
      <PageHeader title="Class Students" subtitle={`${students.length} students enrolled`} />
      <div style={{ padding: '28px 32px' }}>

        {/* Search + Filters */}
        <div className="card" style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search by name or roll number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['all', 'All Students'], ['high', 'High Attendance ≥90%'], ['low', 'Needs Attention <80%']].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)} style={{
                padding: '8px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all .15s', fontFamily: 'var(--font)',
                background: filter === val ? 'var(--brand)' : 'var(--surface-2)',
                color: filter === val ? 'white' : 'var(--text-secondary)',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Search size={40} style={{ margin: '0 auto 12px', opacity: .3, display: 'block' }} />
            <div style={{ fontWeight: 600 }}>No students found</div>
          </div>
        )}

        {/* Student grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {filtered.map(student => {
            const pct = att(student)
            return (
              <div key={student.id} className="card" style={{ padding: 20, cursor: 'pointer', transition: 'all .15s' }}
                onClick={() => setSelected(student)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  {student.photo_url
                    ? <img src={student.photo_url} alt={student.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                    : <div className="avatar avatar-lg" style={{ background: 'var(--brand-light)', color: 'var(--brand)', fontWeight: 800, flexShrink: 0 }}>
                        {student.name?.charAt(0)}
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{student.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Roll No: {student.roll_no}</div>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'ATTENDANCE', value: pct != null ? `${pct}%` : '—', color: attColor(pct) },
                    { label: 'AVG SCORE',  value: student.avg_score != null ? `${student.avg_score}` : '—', color: 'var(--brand)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.5px', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Student Detail Modal */}
        {selected && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: 24 }}
            onClick={() => setSelected(null)}
          >
            <div className="card-lg" style={{ width: 440, maxHeight: 'calc(100vh - 48px)', background: 'var(--surface)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ background: 'var(--brand)', padding: '20px', color: 'white', display: 'flex', gap: 14, alignItems: 'center', position: 'relative', flexShrink: 0 }}>
                {selected.photo_url
                  ? <img src={selected.photo_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,.4)' }} />
                  : <div className="avatar avatar-lg" style={{ background: 'rgba(255,255,255,.2)', color: 'white', border: '2px solid rgba(255,255,255,.4)', fontWeight: 800 }}>
                      {selected.name?.charAt(0)}
                    </div>
                }
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{selected.name}</div>
                  <div style={{ fontSize: 13, opacity: .8 }}>Roll {selected.roll_no}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ position: 'absolute', right: 16, top: 16, background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                <div style={{ padding: 20 }}>

                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Attendance', value: att(selected) != null ? `${att(selected)}%` : '—', color: attColor(att(selected)) },
                      { label: 'Avg Score',  value: selected.avg_score != null ? `${selected.avg_score}` : '—', color: 'var(--brand)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>{label.toUpperCase()}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Parent Contact */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 10 }}>PARENT CONTACT</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {selected.father_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ width: 34, height: 34, background: 'var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Phone size={16} color="var(--text-secondary)" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Father</div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{selected.father_name}</div>
                        </div>
                      </div>
                    )}
                    {selected.mother_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ width: 34, height: 34, background: 'var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Phone size={16} color="var(--text-secondary)" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mother</div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{selected.mother_name}</div>
                        </div>
                      </div>
                    )}
                    {!selected.father_name && !selected.mother_name && (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No parent contact on file</div>
                    )}
                  </div>

                  {/* Add Behaviour Remark */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 10 }}>ADD BEHAVIOUR REMARK</div>

                  {remarkSaved && (
                    <div style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={16} /> Remark saved successfully
                    </div>
                  )}
                  {remarkError && (
                    <div style={{ background: 'var(--accent-red-light)', color: 'var(--accent-red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={16} /> {remarkError}
                    </div>
                  )}

                  {/* Remark Type selector */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    {REMARK_TYPES.map(t => (
                      <button key={t.value} onClick={() => setRemarkType(t.value)} style={{
                        padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', border: `2px solid ${remarkType === t.value ? t.color : 'transparent'}`,
                        background: remarkType === t.value ? t.bg : 'var(--surface-2)',
                        color: remarkType === t.value ? t.color : 'var(--text-secondary)',
                        transition: 'all .15s', fontFamily: 'var(--font)',
                      }}>{t.label}</button>
                    ))}
                  </div>

                  <textarea
                    className="form-input form-textarea"
                    rows={3}
                    placeholder="Write a detailed behaviour note…"
                    value={remarkText}
                    onChange={e => setRemarkText(e.target.value)}
                    style={{ marginBottom: 10, resize: 'vertical' }}
                  />
                  <button
                    className="btn btn-primary btn-full"
                    onClick={handleRemark}
                    disabled={remarkSaving || !remarkText.trim()}
                    style={{ opacity: (remarkSaving || !remarkText.trim()) ? .6 : 1 }}
                  >
                    {remarkSaving
                      ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 6 }} />Saving…</>
                      : <><MessageSquare size={16} /> Save Behaviour Remark</>
                    }
                  </button>

                  {/* Today's logs */}
                  {(studentLogs.length > 0 || loadingLogs) && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 10 }}>TODAY'S REMARKS</div>
                      {loadingLogs
                        ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
                        : studentLogs.map((log, i) => {
                          const ti = typeInfo(log.type)
                          return (
                            <div key={i} style={{ background: ti.bg, borderLeft: `3px solid ${ti.color}`, borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: ti.color, textTransform: 'uppercase' }}>{log.type}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {log.created_at ? new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{log.note}</div>
                              {log.teacher_name && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>— {log.teacher_name}</div>}
                            </div>
                          )
                        })
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
