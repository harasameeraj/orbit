import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  getClassesBySchool, getTeachersBySchool, getTimetable,
  upsertTimetableSlot, deleteTimetableSlot,
} from '../../lib/supabase.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { Clock, Save, Trash2, Plus, Loader, ChevronDown } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const TIME_SLOTS = [
  '08:00', '08:45', '09:30', '10:15', '11:15', '12:00', '12:45', '13:30', '14:15',
]

const SUBJECTS = [
  'Mathematics', 'Science', 'English', 'Hindi', 'Social Studies',
  'Computer Science', 'Physical Education', 'Art', 'Music', 'Library',
]

function SlotCell({ slot, teachers, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [subject, setSubject] = useState(slot?.subject || '')
  const [teacherId, setTeacherId] = useState(slot?.teacher_id || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!subject) return
    setSaving(true)
    try {
      await onSave({ subject, teacher_id: teacherId || null })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!slot?.id) { setEditing(false); return }
    setSaving(true)
    try {
      await onDelete(slot.id)
      setSubject('')
      setTeacherId('')
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div
        onClick={() => { setSubject(slot?.subject || ''); setTeacherId(slot?.teacher_id || ''); setEditing(true) }}
        style={{
          minHeight: 64,
          padding: '8px 10px',
          borderRadius: 8,
          background: slot?.subject ? 'var(--brand-light)' : 'var(--surface-2)',
          border: slot?.subject ? '1px solid var(--brand-mid)' : '1px dashed var(--border)',
          cursor: 'pointer',
          transition: 'all .15s',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {slot?.subject ? (
          <>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--brand)' }}>{slot.subject}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {teachers.find(t => t.id === slot.teacher_id)?.name || 'No teacher'}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={12} /> Add
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      padding: '10px',
      borderRadius: 8,
      background: 'var(--surface)',
      border: '2px solid var(--brand)',
      boxShadow: '0 4px 16px rgba(26,58,107,.12)',
    }}>
      <select
        value={subject}
        onChange={e => setSubject(e.target.value)}
        className="form-input"
        style={{ fontSize: 12, padding: '4px 8px', marginBottom: 6, width: '100%' }}
        autoFocus
      >
        <option value="">Subject…</option>
        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select
        value={teacherId}
        onChange={e => setTeacherId(e.target.value)}
        className="form-input"
        style={{ fontSize: 12, padding: '4px 8px', marginBottom: 8, width: '100%' }}
      >
        <option value="">Teacher…</option>
        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || !subject}
          style={{ flex: 1, padding: '5px', fontSize: 12, gap: 4 }}
        >
          {saving ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
          Save
        </button>
        {slot?.id && (
          <button
            className="btn btn-ghost"
            onClick={handleDelete}
            disabled={saving}
            style={{ padding: '5px 8px', color: 'var(--accent-red, #dc2626)' }}
          >
            <Trash2 size={12} />
          </button>
        )}
        <button
          className="btn btn-ghost"
          onClick={() => setEditing(false)}
          disabled={saving}
          style={{ padding: '5px 8px', fontSize: 12 }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default function AdminTimetable() {
  const { profile } = useAuth()
  const schoolId = profile?.school_id

  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [slots, setSlots] = useState([]) // raw rows from DB
  const [loading, setLoading] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    if (!schoolId) return
    Promise.all([
      getClassesBySchool(schoolId),
      getTeachersBySchool(schoolId),
    ]).then(([cls, tch]) => {
      setClasses(cls || [])
      setTeachers(tch || [])
      if (cls?.length) setSelectedClassId(cls[0].id)
    })
  }, [schoolId])

  useEffect(() => {
    if (!selectedClassId) return
    setLoading(true)
    getTimetable(selectedClassId).then(rows => {
      setSlots(rows || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [selectedClassId])

  // Build lookup: day+time → slot row
  const slotMap = {}
  slots.forEach(s => {
    const key = `${s.day_of_week}__${s.start_time?.slice(0,5)}`
    slotMap[key] = s
  })

  const handleSave = async (day, time, { subject, teacher_id }) => {
    const existing = slotMap[`${day}__${time}`]
    const end = addMinutes(time, 40)
    const payload = {
      class_id: selectedClassId,
      school_id: schoolId,
      day_of_week: day,
      start_time: time + ':00',
      end_time: end + ':00',
      subject,
      teacher_id: teacher_id || null,
      ...(existing?.id ? { id: existing.id } : {}),
    }
    const saved = await upsertTimetableSlot(payload)
    setSlots(prev => {
      const without = prev.filter(s => s.id !== saved.id)
      return [...without, saved]
    })
    setSaveMsg('Saved!')
    setTimeout(() => setSaveMsg(''), 1500)
  }

  const handleDelete = async (id) => {
    await deleteTimetableSlot(id)
    setSlots(prev => prev.filter(s => s.id !== id))
    setSaveMsg('Deleted!')
    setTimeout(() => setSaveMsg(''), 1500)
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)

  return (
    <div className="animate-fade-in">
      <PageHeader title="Timetable" subtitle="Manage weekly class schedules" />
      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Weekly Timetable</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
              Click any cell to add or edit a period. Changes are saved instantly.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {saveMsg && (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)', background: 'var(--accent-green-light)', padding: '6px 14px', borderRadius: 8 }}>
                ✓ {saveMsg}
              </span>
            )}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="form-input"
                style={{ paddingRight: 32, appearance: 'none', fontWeight: 700, minWidth: 160 }}
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>Class {c.grade} – {c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, background: 'var(--brand-light)', border: '1px solid var(--brand-mid)', borderRadius: 3 }} />
            Period scheduled
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, background: 'var(--surface-2)', border: '1px dashed var(--border)', borderRadius: 3 }} />
            Empty slot — click to add
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <Loader size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
            <div>Loading timetable…</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 80, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>
                      <Clock size={13} /> Time
                    </div>
                  </th>
                  {DAYS.map(day => (
                    <th key={day} style={{ ...thStyle, textAlign: 'center', minWidth: 140 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--brand)' }}>{day}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time, ri) => (
                  <tr key={time}>
                    <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{time}</div>
                      <div style={{ fontSize: 10, color: 'var(--border)' }}>–{addMinutes(time, 40)}</div>
                    </td>
                    {DAYS.map(day => {
                      const key = `${day}__${time}`
                      const slot = slotMap[key]
                      return (
                        <td key={day} style={{ ...tdStyle, verticalAlign: 'top' }}>
                          <SlotCell
                            slot={slot}
                            teachers={teachers}
                            onSave={(vals) => handleSave(day, time, vals)}
                            onDelete={handleDelete}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, textAlign: 'center' }}>
          {slots.length} period{slots.length !== 1 ? 's' : ''} scheduled for {selectedClass ? `Class ${selectedClass.grade} – ${selectedClass.name}` : ''}
        </p>
      </div>
    </div>
  )
}

const thStyle = {
  padding: '10px 8px',
  borderBottom: '2px solid var(--border)',
  background: 'var(--surface)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
}

const tdStyle = {
  padding: '6px 8px',
  borderBottom: '1px solid var(--border)',
}

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}
