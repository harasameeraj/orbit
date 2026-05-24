import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { Search, Plus, X, ChevronLeft, ChevronRight, Loader2, Pencil, Trash2 } from 'lucide-react'
import { supabase, getClassesBySchool } from '../../lib/supabase.js'

const PAGE_SIZE = 8

export default function AdminUsers() {
  const { user, profile } = useAuth()
  const { students, reloadData } = useData()
  const [tab, setTab] = useState('students')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [teachers, setTeachers] = useState([])
  const [teachersLoaded, setTeachersLoaded] = useState(false)
  const [classes, setClasses] = useState([])

  const [form, setForm] = useState({
    name: '', email: '', roll_no: '', class_id: '',
    father_name: '', phone: '', subject: '', role: 'parent'
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formMsg, setFormMsg] = useState({ type: '', text: '' })

  // Edit state
  const [editItem, setEditItem] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [editMsg, setEditMsg] = useState({ type: '', text: '' })

  // Remove state
  const [removeItem, setRemoveItem] = useState(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  // Fetch classes list for school
  useEffect(() => {
    if (profile?.school_id) {
      getClassesBySchool(profile.school_id).then(res => {
        setClasses(res || [])
        if (res && res.length > 0) {
          setForm(f => ({ ...f, class_id: res[0].id }))
        }
      })
    }
  }, [profile?.school_id])

  // Load teachers when tab switches
  const handleTabChange = async (t) => {
    setTab(t)
    setPage(1)
    if (t === 'teachers' && !teachersLoaded) {
      const { data } = await supabase
        .from('profiles')
        .select('*, teacher_classes(classes(name), subject)')
        .eq('school_id', profile?.school_id)
        .eq('role', 'teacher')
        .order('name')
      setTeachers(data || [])
      setTeachersLoaded(true)
    }
  }

  const items = tab === 'students' ? students : teachers
  const filtered = items.filter(s => {
    const q = search.toLowerCase()
    return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q)
  })
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleAdd = async () => {
    if (!form.name || !form.email) {
      setFormMsg({ type: 'error', text: 'Name and email are required.' })
      return
    }
    if (tab === 'students' && !form.class_id) {
      setFormMsg({ type: 'error', text: 'Please select a class for the student.' })
      return
    }
    setFormLoading(true)
    setFormMsg({ type: '', text: '' })
    try {
      let studentId = null

      // 1. If adding a student, create the student database row first to obtain a studentId
      if (tab === 'students') {
        const { data: newStudent, error: studentErr } = await supabase
          .from('students')
          .insert({
            school_id: profile?.school_id,
            class_id: form.class_id,
            name: form.name,
            roll_no: form.roll_no || '—',
            father_name: form.father_name || '',
          })
          .select('id')
          .single()

        if (studentErr) throw studentErr
        studentId = newStudent.id
      }

      // 2. Invite the user (parent/teacher) and pass studentId if applicable
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: form.email,
          name: form.name,
          role: tab === 'students' ? 'parent' : 'teacher',
          school_id: profile?.school_id,
          ...(form.subject && { subject: form.subject }),
          ...(form.class_id && { class_id: form.class_id }),
          ...(studentId && { student_id: studentId }),
        }
      })
      if (error) throw error

      setFormMsg({ type: 'success', text: `Invite sent to ${form.email}! They will receive an email to set their password.` })
      setForm({ name: '', email: '', roll_no: '', class_id: classes[0]?.id || '', father_name: '', phone: '', subject: '', role: 'parent' })
    } catch (e) {
      setFormMsg({ type: 'error', text: e.message || 'Failed to invite user.' })
    }
    setFormLoading(false)
  }

  // ── Edit handler ────────────────────────────────────────────────────────────
  const openEdit = (item) => {
    setEditMsg({ type: '', text: '' })
    if (tab === 'students') {
      setEditForm({ name: item.name || '', roll_no: item.roll_no || '', class_id: item.class_id || '', father_name: item.father_name || '' })
    } else {
      setEditForm({ name: item.name || '', email: item.email || '' })
    }
    setEditItem(item)
  }

  const handleEdit = async () => {
    if (!editForm.name?.trim()) { setEditMsg({ type: 'error', text: 'Name is required.' }); return }
    setEditLoading(true)
    setEditMsg({ type: '', text: '' })
    try {
      if (tab === 'students') {
        const { error } = await supabase.from('students').update({
          name: editForm.name, roll_no: editForm.roll_no, class_id: editForm.class_id, father_name: editForm.father_name
        }).eq('id', editItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('profiles').update({ name: editForm.name }).eq('id', editItem.id)
        if (error) throw error
      }
      setEditMsg({ type: 'success', text: 'Updated successfully!' })
      // Reload the relevant list
      if (tab === 'students') {
        reloadData()
      } else {
        const { data } = await supabase.from('profiles').select('*, teacher_classes(classes(name), subject)').eq('school_id', profile?.school_id).eq('role', 'teacher').order('name')
        setTeachers(data || [])
      }
      setTimeout(() => setEditItem(null), 1200)
    } catch (e) {
      setEditMsg({ type: 'error', text: e.message || 'Update failed.' })
    }
    setEditLoading(false)
  }

  // ── Remove handler ──────────────────────────────────────────────────────────
  const handleRemove = async () => {
    if (!removeItem) return
    setRemoveLoading(true)
    try {
      if (tab === 'students') {
        const { error } = await supabase.from('students').delete().eq('id', removeItem.id)
        if (error) throw error
        reloadData()
      } else {
        // Deactivate teacher: remove their class assignments and mark inactive
        await supabase.from('teacher_classes').delete().eq('teacher_id', removeItem.id)
        const { error } = await supabase.from('profiles').update({ role: 'deactivated' }).eq('id', removeItem.id)
        if (error) throw error
        const { data } = await supabase.from('profiles').select('*, teacher_classes(classes(name), subject)').eq('school_id', profile?.school_id).eq('role', 'teacher').order('name')
        setTeachers(data || [])
      }
      setRemoveItem(null)
    } catch (e) {
      console.error('Remove failed:', e)
    }
    setRemoveLoading(false)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="User Management"
        subtitle="Manage students, teachers, and staff credentials."
        action={
          <button className="btn btn-primary btn-sm" onClick={() => { setShowAdd(true); setFormMsg({ type: '', text: '' }) }}>
            <Plus size={15} /> Add {tab === 'students' ? 'Student' : 'Teacher'}
          </button>
        }
      />
      <div style={{ padding: '28px 32px' }}>

        <div className="tabs" style={{ maxWidth: 300, marginBottom: 24 }}>
          <button className={`tab ${tab === 'students' ? 'active' : ''}`} onClick={() => handleTabChange('students')}>Students</button>
          <button className={`tab ${tab === 'teachers' ? 'active' : ''}`} onClick={() => handleTabChange('teachers')}>Teachers</button>
        </div>

        {/* Search */}
        <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                {['Name', tab === 'students' ? 'Roll No' : 'Subject', tab === 'students' ? 'Class' : 'Assigned Class', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No {tab} found</td></tr>
              ) : paged.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar avatar-sm" style={{ background: 'var(--brand-light)', color: 'var(--brand)', fontWeight: 700 }}>
                        {(item.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600 }}>
                    {tab === 'students' ? (item.roll_no || '—') : (item.teacher_classes?.[0]?.subject || '—')}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13 }}>
                    {tab === 'students' ? (item.classes?.name || item.class || '—') : (item.teacher_classes?.[0]?.classes?.name || '—')}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}><Pencil size={13} /> Edit</button>
                      <button className="btn btn-sm" style={{ background: 'var(--accent-red-light)', color: 'var(--accent-red)', border: 'none' }} onClick={() => setRemoveItem(item)}><Trash2 size={13} /> Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Showing {paged.length} of {filtered.length} {tab}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ background: page === 1 ? 'var(--surface-2)' : 'var(--brand)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: page === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: page === 1 ? 'var(--text-muted)' : 'white' }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{page} / {totalPages || 1}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                style={{ background: page >= totalPages ? 'var(--surface-2)' : 'var(--brand)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: page >= totalPages ? 'var(--text-muted)' : 'white' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Add Modal */}
        {showAdd && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowAdd(false)}>
            <div className="card-lg" style={{ padding: 32, width: 500, background: 'var(--surface)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Add {tab === 'students' ? 'Student' : 'Teacher'}</h2>
                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>

              {formMsg.text && (
                <div style={{ background: formMsg.type === 'success' ? 'var(--accent-green-light)' : 'var(--accent-red-light)', color: formMsg.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', padding: '12px 14px', borderRadius: 8, fontWeight: 600, marginBottom: 16, fontSize: 14, lineHeight: 1.5 }}>
                  {formMsg.text}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" placeholder="e.g. Arjun Sharma" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" placeholder="user@school.edu.in" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                
                {/* Class Select Dropdown */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Class *</label>
                  <select className="form-input form-select" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
                    <option value="">Select a Class...</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>Class {c.grade} – {c.name}</option>
                    ))}
                  </select>
                </div>

                {tab === 'students' ? (<>
                  <div className="form-group">
                    <label className="form-label">Roll No</label>
                    <input className="form-input" placeholder="e.g. 10A01" value={form.roll_no} onChange={e => setForm(f => ({ ...f, roll_no: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Father's Name</label>
                    <input className="form-input" placeholder="e.g. Mr. Sunil Sharma" value={form.father_name} onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))} />
                  </div>
                </>) : (<>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Subject</label>
                    <input className="form-input" placeholder="e.g. Mathematics" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
                  </div>
                </>)}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-primary btn-full btn-lg" onClick={handleAdd} disabled={formLoading}>
                  {formLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  {formLoading ? 'Sending invite...' : 'Add & Send Invite Email'}
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
                An invitation email with a login link will be sent automatically
              </p>
            </div>
          </div>
        )}
        {/* Edit Modal */}
        {editItem && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setEditItem(null)}>
            <div className="card-lg" style={{ padding: 32, width: 480, background: 'var(--surface)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Edit {tab === 'students' ? 'Student' : 'Teacher'}</h2>
                <button onClick={() => setEditItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              {editMsg.text && (
                <div style={{ background: editMsg.type === 'success' ? 'var(--accent-green-light)' : 'var(--accent-red-light)', color: editMsg.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', padding: '12px 14px', borderRadius: 8, fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
                  {editMsg.text}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                {tab === 'students' && (<>
                  <div className="form-group">
                    <label className="form-label">Roll No</label>
                    <input className="form-input" value={editForm.roll_no || ''} onChange={e => setEditForm(f => ({ ...f, roll_no: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Father's Name</label>
                    <input className="form-input" value={editForm.father_name || ''} onChange={e => setEditForm(f => ({ ...f, father_name: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Class</label>
                    <select className="form-input form-select" value={editForm.class_id || ''} onChange={e => setEditForm(f => ({ ...f, class_id: e.target.value }))}>
                      <option value="">Select a Class...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>Class {c.grade} – {c.name}</option>
                      ))}
                    </select>
                  </div>
                </>)}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-primary btn-full btn-lg" onClick={handleEdit} disabled={editLoading}>
                  {editLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => setEditItem(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Confirmation */}
        {removeItem && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setRemoveItem(null)}>
            <div className="card-lg" style={{ padding: 32, width: 420, background: 'var(--surface)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 56, height: 56, background: 'var(--accent-red-light)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Trash2 size={24} color="var(--accent-red)" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Remove {removeItem.name}?</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
                {tab === 'students'
                  ? 'This will permanently delete this student and all their associated records (attendance, marks, etc.). This action cannot be undone.'
                  : 'This will deactivate this teacher account and remove their class assignments. The account can be re-activated later.'}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-lg" style={{ background: 'var(--accent-red)', color: 'white', border: 'none', padding: '12px 28px' }} onClick={handleRemove} disabled={removeLoading}>
                  {removeLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
                  {removeLoading ? 'Removing…' : 'Yes, Remove'}
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => setRemoveItem(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
