import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  getCalendarEvents, createCalendarEvent,
  updateCalendarEvent, deleteCalendarEvent,
} from '../../lib/supabase.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { CalendarDays, Plus, Trash2, Pencil, X, Loader, ChevronLeft, ChevronRight } from 'lucide-react'

const EVENT_TYPES = [
  { value: 'exam',     label: 'Exam',     color: 'var(--accent-amber)',  bg: 'var(--accent-amber-light)',  dot: '#f59e0b' },
  { value: 'holiday',  label: 'Holiday',  color: '#7c3aed',             bg: '#f5f3ff',                    dot: '#7c3aed' },
  { value: 'event',    label: 'Event',    color: 'var(--accent-green)',  bg: 'var(--accent-green-light)',  dot: '#16a34a' },
  { value: 'meeting',  label: 'Meeting',  color: 'var(--accent-blue)',   bg: 'var(--accent-blue-light)',   dot: '#0891b2' },
  { value: 'sports',   label: 'Sports',   color: '#e11d48',             bg: '#fff1f2',                    dot: '#e11d48' },
]

const typeInfo = (type) => EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[2]

function EventModal({ event, onClose, onSave }) {
  const isEdit = !!event?.id
  const [form, setForm] = useState({
    name: event?.name || '',
    event_date: event?.event_date || new Date().toISOString().split('T')[0],
    type: event?.type || 'event',
    description: event?.description || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Event name is required.'); return }
    if (!form.event_date) { setError('Date is required.'); return }
    setError('')
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div className="card-lg" style={{ padding: 28, width: '100%', maxWidth: 460, background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{isEdit ? 'Edit Event' : 'Add Calendar Event'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        {error && <div style={{ background: '#fff1f2', color: '#e11d48', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>EVENT NAME *</label>
            <input
              className="form-input"
              placeholder="e.g. Annual Sports Day"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>DATE *</label>
              <input
                type="date"
                className="form-input"
                value={form.event_date}
                onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>TYPE</label>
              <select
                className="form-input"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>DESCRIPTION (optional)</label>
            <textarea
              className="form-input form-textarea"
              rows={3}
              placeholder="Additional details about this event…"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>

        {/* Type chips preview */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {EVENT_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setForm(f => ({ ...f, type: t.value }))}
              style={{
                padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: `1.5px solid ${form.type === t.value ? t.dot : 'transparent'}`,
                background: form.type === t.value ? t.bg : 'var(--surface-2)',
                color: form.type === t.value ? t.color : 'var(--text-muted)',
                transition: 'all .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {isEdit ? 'Update Event' : 'Add Event'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminCalendar() {
  const { profile } = useAuth()
  const schoolId = profile?.school_id

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalEvent, setModalEvent] = useState(null) // null=closed, {}=new, {id,...}=edit
  const [deleting, setDeleting] = useState(null)

  // Current month view
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0-indexed

  // Load events for ±3 months for list, whole year for calendar dots
  useEffect(() => {
    if (!schoolId) return
    const from = new Date(viewYear, viewMonth - 1, 1).toISOString().split('T')[0]
    const to   = new Date(viewYear, viewMonth + 2, 0).toISOString().split('T')[0]
    setLoading(true)
    getCalendarEvents(schoolId, from, to)
      .then(rows => setEvents(rows || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [schoolId, viewYear, viewMonth])

  const handleSave = async (form) => {
    if (modalEvent?.id) {
      const updated = await updateCalendarEvent(modalEvent.id, { ...form, school_id: schoolId })
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
    } else {
      const created = await createCalendarEvent({ ...form, school_id: schoolId })
      setEvents(prev => [...prev, created].sort((a, b) => a.event_date.localeCompare(b.event_date)))
    }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await deleteCalendarEvent(id)
      setEvents(prev => prev.filter(e => e.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const firstDay = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const monthEvents = events.filter(e => {
    const d = new Date(e.event_date)
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth
  })
  const eventsByDay = {}
  monthEvents.forEach(e => {
    const day = new Date(e.event_date).getDate()
    if (!eventsByDay[day]) eventsByDay[day] = []
    eventsByDay[day].push(e)
  })

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11) } else setViewMonth(m => m-1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0) } else setViewMonth(m => m+1) }

  // Upcoming events (sorted, future-first)
  const today = new Date().toISOString().split('T')[0]
  const upcoming = [...events].sort((a,b) => a.event_date.localeCompare(b.event_date))

  return (
    <div className="animate-fade-in">
      <PageHeader title="Academic Calendar" subtitle="Manage school events and holidays" />
      <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Academic Calendar</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
              Add exams, holidays, events, meetings, and sports days
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setModalEvent({})}>
            <Plus size={16} /> Add Event
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 24, alignItems: 'start' }}>

          {/* Calendar grid */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={prevMonth}><ChevronLeft size={16} /></button>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
              <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={nextMonth}><ChevronRight size={16} /></button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayEvents = eventsByDay[day] || []
                const isToday = new Date(viewYear, viewMonth, day).toISOString().split('T')[0] === today
                return (
                  <div
                    key={day}
                    onClick={() => setModalEvent({ event_date: new Date(viewYear, viewMonth, day + 1).toISOString().split('T')[0] })}
                    style={{
                      minHeight: 40,
                      padding: '4px',
                      borderRadius: 6,
                      background: isToday ? 'var(--brand-light)' : 'transparent',
                      border: isToday ? '1.5px solid var(--brand-mid)' : '1px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'background .1s',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--brand)' : 'var(--text)' }}>{day}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', marginTop: 2 }}>
                      {dayEvents.slice(0, 2).map(ev => (
                        <div key={ev.id} style={{ width: 6, height: 6, borderRadius: '50%', background: typeInfo(ev.type).dot }} />
                      ))}
                      {dayEvents.length > 2 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {EVENT_TYPES.map(t => (
                <div key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.dot }} />
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          {/* Events list */}
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>
              {MONTH_NAMES[viewMonth]} Events
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>({monthEvents.length})</span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : monthEvents.length === 0 ? (
              <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                <CalendarDays size={32} style={{ marginBottom: 10, opacity: .4 }} />
                <div style={{ fontWeight: 700 }}>No events this month</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Click "+ Add Event" to create one</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {monthEvents
                  .sort((a, b) => a.event_date.localeCompare(b.event_date))
                  .map(ev => {
                    const ti = typeInfo(ev.type)
                    const evDate = new Date(ev.event_date)
                    return (
                      <div key={ev.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, borderLeft: `3px solid ${ti.dot}` }}>
                        <div style={{ width: 44, flexShrink: 0, textAlign: 'center', background: ti.bg, borderRadius: 8, padding: '6px 4px' }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: ti.color, textTransform: 'uppercase' }}>
                            {evDate.toLocaleDateString('en-IN', { month: 'short' })}
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: ti.color, lineHeight: 1 }}>
                            {evDate.getDate()}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{ev.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: ti.color, background: ti.bg, padding: '2px 8px', borderRadius: 99 }}>{ti.label}</span>
                          </div>
                          {ev.description && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.4 }}>{ev.description}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button
                            className="btn btn-ghost"
                            onClick={() => setModalEvent(ev)}
                            style={{ padding: '6px', color: 'var(--brand)' }}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => handleDelete(ev.id)}
                            disabled={deleting === ev.id}
                            style={{ padding: '6px', color: 'var(--accent-red, #dc2626)' }}
                            title="Delete"
                          >
                            {deleting === ev.id
                              ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                              : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {modalEvent !== null && (
        <EventModal
          event={modalEvent}
          onClose={() => setModalEvent(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
