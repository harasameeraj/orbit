import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { Search, Plus, X, ChevronLeft, ChevronRight, Loader2, Pencil, Trash2, Upload, BookOpen, CheckCircle, AlertCircle, Download, Info } from 'lucide-react'
import { supabase, getClassesBySchool, getTeacherAssignments, addTeacherAssignment, removeTeacherAssignment, inviteUser } from '../../lib/supabase.js'

const PAGE_SIZE = 8

// ── Helpers ───────────────────────────────────────────────────────────────────
// Normalise a class name for fuzzy matching:
// strips spaces, dashes, underscores and lowercases — so "10-B", "10B", "10 b" all match
function normaliseClass(str) {
  return (str || '').toLowerCase().replace(/[\s\-_]/g, '')
}

function findClass(classes, name) {
  return classes.find(c => normaliseClass(c.name) === normaliseClass(name))
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  // Strip UTF-8 BOM if present
  const cleanText = text.replace(/^\uFEFF/, '')

  // Auto-detect delimiter: tab, semicolon, or comma
  const firstLine = cleanText.split(/\r?\n/)[0] || ''
  const tabCount = (firstLine.match(/\t/g) || []).length
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const delimiter = tabCount > commaCount && tabCount > semicolonCount ? '\t'
    : semicolonCount > commaCount ? ';'
    : ','

  const lines = []
  let row = []
  let inQuotes = false
  let currentVal = ''

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i]
    const nextChar = cleanText[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"'
        i++ // skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      row.push(currentVal.trim())
      currentVal = ''
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      row.push(currentVal.trim())
      lines.push(row)
      row = []
      currentVal = ''
    } else {
      currentVal += char
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim())
    lines.push(row)
  }

  // Filter out completely empty rows
  const nonEmptyLines = lines.filter(l => l.length > 0 && l.some(val => val !== ''))
  if (nonEmptyLines.length < 2) return []

  const headers = nonEmptyLines[0].map(h => 
    h.toLowerCase().trim().replace(/"/g, '').replace(/\s+/g, '_')
  )

  return nonEmptyLines.slice(1).map((r, i) => {
    const obj = { _row: i + 2, _errors: [], _status: 'pending' }
    headers.forEach((h, j) => { 
      obj[h] = r[j] || '' 
    })
    return obj
  })
}

function validateStudentRow(row, classes, existingStudents) {
  const errs = []
  if (!row.name?.trim()) errs.push('Name required')
  if (!row.parent_email?.trim()) errs.push('parent_email required')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.parent_email)) errs.push('Invalid parent_email')
  
  const cls = findClass(classes, row.class_name)
  if (!row.class_name?.trim()) {
    errs.push('class_name required')
  } else if (!cls) {
    errs.push(`Class "${row.class_name}" not found`)
  }

  if (cls && row.roll_no?.trim() && row.roll_no !== '—') {
    const isDup = existingStudents.some(s => 
      s.class_id === cls.id && 
      (s.roll_no || '').toLowerCase().trim() === row.roll_no.toLowerCase().trim()
    )
    if (isDup) {
      errs.push(`Roll number "${row.roll_no}" already exists in class "${row.class_name}"`)
    }
  }
  return errs
}

function validateTeacherRow(row, classes, existingTeachers) {
  const errs = []
  if (!row.name?.trim()) errs.push('Name required')
  if (!row.email?.trim()) errs.push('Email required')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errs.push('Invalid email')
  
  const cls = findClass(classes, row.class_name)
  if (!row.class_name?.trim()) {
    errs.push('class_name required')
  } else if (!cls) {
    errs.push(`Class "${row.class_name}" not found`)
  }

  if (row.email?.trim()) {
    const isDup = existingTeachers.some(t => 
      (t.email || '').toLowerCase().trim() === row.email.toLowerCase().trim()
    )
    if (isDup) {
      errs.push(`Teacher with email "${row.email}" is already registered`)
    }
  }
  return errs
}

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

  // Teacher assignment state (inside teacher edit modal)
  const [teacherAssignments, setTeacherAssignments] = useState([])
  const [assignLoading, setAssignLoading] = useState(false)
  const [newAssign, setNewAssign] = useState({ class_id: '', subject: '', is_class_teacher: false })
  const [addAssignLoading, setAddAssignLoading] = useState(false)

  // Remove state
  const [removeItem, setRemoveItem] = useState(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  // Add Class state
  const [showAddClass, setShowAddClass] = useState(false)
  const [classForm, setClassForm] = useState({ grade: '1', section: 'A', name: '' })
  const [classFormLoading, setClassFormLoading] = useState(false)
  const [classFormMsg, setClassFormMsg] = useState({ type: '', text: '' })

  // CSV import state
  const [showImportGuide, setShowImportGuide] = useState(false)
  const [csvRows, setCsvRows] = useState([])
  const [showCsvPreview, setShowCsvPreview] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvProgress, setCsvProgress] = useState(0)
  const csvFileRef = useRef(null)

  // Fetch classes list for school
  useEffect(() => {
    if (profile?.school_id) {
      getClassesBySchool(profile.school_id).then(res => {
        setClasses(res || [])
        if (res && res.length > 0) {
          setForm(f => ({ ...f, class_id: res[0].id }))
          setNewAssign(a => ({ ...a, class_id: res[0].id }))
        }
      })
      reloadTeachers().then(() => setTeachersLoaded(true))
    }
  }, [profile?.school_id])

  const reloadTeachers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*, teacher_classes(classes(name), subject)')
      .eq('school_id', profile?.school_id)
      .eq('role', 'teacher')
      .order('name')
    setTeachers(data || [])
  }

  const handleTabChange = async (t) => {
    setTab(t)
    setPage(1)
    setSearch('')
    if (t === 'teachers' && !teachersLoaded) {
      await reloadTeachers()
      setTeachersLoaded(true)
    }
  }

  const items = tab === 'students' ? students : tab === 'teachers' ? teachers : []
  const filtered = items.filter(s => {
    const q = search.toLowerCase()
    return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q)
  })
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Classes tab — compute student counts from already-loaded students array
  const classesWithCounts = classes.map(c => ({
    ...c,
    studentCount: students.filter(s => s.class_id === c.id).length,
  }))

  // ── Add Student/Teacher ─────────────────────────────────────────────────────
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

      const result = await inviteUser({
        email: form.email,
        name: form.name,
        role: tab === 'students' ? 'parent' : 'teacher',
        schoolId: profile?.school_id,
        extraMeta: {
          ...(form.subject && { subject: form.subject }),
          ...(form.class_id && { class_id: form.class_id }),
          ...(studentId && { student_id: studentId }),
        }
      })

      const msg = result?.existing
        ? `${form.email} already has an account — student linked to their existing login. No email sent.`
        : `Invite sent to ${form.email}! They will receive an email to set their password.`
      setFormMsg({ type: 'success', text: msg })
      setForm({ name: '', email: '', roll_no: '', class_id: classes[0]?.id || '', father_name: '', phone: '', subject: '', role: 'parent' })
      if (tab === 'teachers') { await reloadTeachers(); setTeachersLoaded(true) }
      else reloadData()
    } catch (e) {
      setFormMsg({ type: 'error', text: e.message || 'Failed to invite user.' })
    }
    setFormLoading(false)
  }

  // ── Add Class ──────────────────────────────────────────────────────────────
  const handleAddClass = async () => {
    if (!classForm.name.trim()) {
      setClassFormMsg({ type: 'error', text: 'Class name is required.' })
      return
    }
    setClassFormLoading(true)
    setClassFormMsg({ type: '', text: '' })
    try {
      const { data, error } = await supabase.from('classes').insert({
        school_id: profile?.school_id,
        grade: classForm.grade.trim() || classForm.name.trim(),
        section: classForm.section.trim() || '',
        name: classForm.name.trim(),
      }).select().single()
      if (error) throw error
      setClasses(prev => [...prev, data])
      setClassFormMsg({ type: 'success', text: `Class "${classForm.name.trim()}" created!` })
      setClassForm({ grade: '', section: '', name: '' })
      setTimeout(() => setShowAddClass(false), 1200)
    } catch (e) {
      setClassFormMsg({ type: 'error', text: e.message || 'Failed to create class.' })
    }
    setClassFormLoading(false)
  }

  // ── CSV Import ──────────────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const classExample = classes[0]?.name || 'YourClassName'
    const lines = tab === 'students'
      ? [
          'name,roll_no,class_name,father_name,parent_email',
          `Arjun Sharma,01,${classExample},Mr. Sunil Sharma,parent1@example.com`,
          `Priya Patel,02,${classExample},Mr. Raj Patel,parent2@example.com`,
        ]
      : [
          'name,email,class_name,subject,is_class_teacher',
          `Mr. Rajesh Iyer,rajesh@school.edu.in,${classExample},Mathematics,true`,
          `Ms. Sunita Rao,sunita@school.edu.in,${classExample},Science,false`,
        ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = tab === 'students' ? 'students_template.csv' : 'teachers_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCsvFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isXlsx = file.name.match(/\.xlsx?$/i)
    const reader = new FileReader()
    reader.onload = (ev) => {
      let rows
      if (isXlsx) {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (data.length < 2) { rows = [] }
        else {
          const headers = data[0].map(h => String(h).toLowerCase().trim().replace(/\s+/g, '_'))
          rows = data.slice(1)
            .filter(r => r.some(v => String(v).trim() !== ''))
            .map((r, i) => {
              const obj = { _row: i + 2, _errors: [], _status: 'pending' }
              headers.forEach((h, j) => { obj[h] = r[j] != null ? String(r[j]).trim() : '' })
              return obj
            })
        }
      } else {
        rows = parseCSV(ev.target.result)
      }
      const validated = rows.map(row => {
        const errs = tab === 'students'
          ? validateStudentRow(row, classes, students)
          : validateTeacherRow(row, classes, teachers)
        return { ...row, _errors: errs, _status: errs.length > 0 ? 'error' : 'pending' }
      })
      setCsvRows(validated)
      setCsvProgress(0)
      setShowCsvPreview(true)
    }
    if (isXlsx) reader.readAsArrayBuffer(file)
    else reader.readAsText(file)
    e.target.value = ''
  }

  const handleCsvImport = async () => {
    const validCount = csvRows.filter(r => r._status === 'pending').length
    if (!validCount) return
    setCsvImporting(true)
    setCsvProgress(0)
    let done = 0
    const updated = [...csvRows]

    for (let i = 0; i < updated.length; i++) {
      const row = updated[i]
      if (row._status !== 'pending') continue
      const cls = findClass(classes, row.class_name)
      try {
        if (tab === 'students') {
          const { data: newSt, error: stErr } = await supabase.from('students').insert({
            school_id: profile?.school_id,
            class_id: cls.id,
            name: row.name,
            roll_no: row.roll_no || '—',
            father_name: row.father_name || '',
          }).select('id').single()
          if (stErr) throw stErr

          let inviteError = null
          let result = null
          try {
            result = await inviteUser({
              email: row.parent_email,
              name: row.father_name || `Parent of ${row.name}`,
              role: 'parent',
              schoolId: profile?.school_id,
              extraMeta: {
                class_id: cls.id,
                student_id: newSt.id,
              }
            })
          } catch (err) {
            inviteError = err
          }

          if (inviteError) {
            console.warn('inviteUser failed:', inviteError)
            updated[i] = {
              ...updated[i],
              _status: 'success',
              _warning: `Student record created, but parent account creation failed: ${inviteError.message}`
            }
          } else {
            const warning = result?.existing
              ? `Parent already has an account — student linked to their existing login. No email sent.`
              : result?.fallback
              ? `Parent account created. Initial password: Parent@1234`
              : null
            updated[i] = {
              ...updated[i],
              _status: 'success',
              ...(warning && { _warning: warning })
            }
          }
        } else {
          let inviteError = null
          let result = null
          try {
            result = await inviteUser({
              email: row.email,
              name: row.name,
              role: 'teacher',
              schoolId: profile?.school_id,
              extraMeta: {
                class_id: cls.id,
                subject: row.subject || '',
                is_class_teacher: row.is_class_teacher === 'true',
              }
            })
          } catch (err) {
            inviteError = err
          }

          if (inviteError) {
            throw inviteError
          }
          const warning = result?.fallback 
            ? 'Teacher account created locally via fallback (email sent rate-limited or Edge Function skipped).'
            : null
          updated[i] = { 
            ...updated[i], 
            _status: 'success',
            ...(warning && { _warning: warning })
          }
        }
      } catch (e) {
        updated[i] = { ...updated[i], _status: 'fail', _errors: [e.message || 'Import failed'] }
      }
      done++
      setCsvProgress(done)
      setCsvRows([...updated])
    }

    setCsvImporting(false)
    reloadData()
    if (tab === 'teachers') { await reloadTeachers(); setTeachersLoaded(true) }
  }

  // ── Edit ────────────────────────────────────────────────────────────────────
  const openEdit = async (item) => {
    setEditMsg({ type: '', text: '' })
    setTeacherAssignments([])
    setNewAssign({ class_id: classes[0]?.id || '', subject: '', is_class_teacher: false })
    if (tab === 'students') {
      setEditForm({ name: item.name || '', roll_no: item.roll_no || '', class_id: item.class_id || '', father_name: item.father_name || '' })
    } else {
      setEditForm({ name: item.name || '' })
      setAssignLoading(true)
      try {
        const assignments = await getTeacherAssignments(item.id)
        setTeacherAssignments(assignments)
      } catch (e) {
        console.error('Failed to load assignments:', e)
      }
      setAssignLoading(false)
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
        reloadData()
      } else {
        const { error } = await supabase.from('profiles').update({ name: editForm.name }).eq('id', editItem.id)
        if (error) throw error
        await reloadTeachers()
      }
      setEditMsg({ type: 'success', text: 'Name updated!' })
      if (tab === 'students') setTimeout(() => setEditItem(null), 900)
    } catch (e) {
      setEditMsg({ type: 'error', text: e.message || 'Update failed.' })
    }
    setEditLoading(false)
  }

  // ── Teacher assignment actions ────────────────────────────────────────────
  const handleAddAssignment = async () => {
    if (!newAssign.class_id || !newAssign.subject.trim()) {
      setEditMsg({ type: 'error', text: 'Select a class and enter a subject.' })
      return
    }
    setAddAssignLoading(true)
    setEditMsg({ type: '', text: '' })
    try {
      await addTeacherAssignment({
        teacher_id: editItem.id,
        class_id: newAssign.class_id,
        school_id: profile?.school_id,
        subject: newAssign.subject.trim(),
        is_class_teacher: newAssign.is_class_teacher,
      })
      const updated = await getTeacherAssignments(editItem.id)
      setTeacherAssignments(updated)
      setNewAssign({ class_id: classes[0]?.id || '', subject: '', is_class_teacher: false })
      setEditMsg({ type: 'success', text: 'Assignment added!' })
      await reloadTeachers()
    } catch (e) {
      setEditMsg({ type: 'error', text: e.message || 'Failed to add assignment.' })
    }
    setAddAssignLoading(false)
  }

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await removeTeacherAssignment(assignmentId)
      setTeacherAssignments(prev => prev.filter(a => a.id !== assignmentId))
      await reloadTeachers()
    } catch (e) {
      setEditMsg({ type: 'error', text: e.message || 'Failed to remove assignment.' })
    }
  }

  // ── Remove ──────────────────────────────────────────────────────────────────
  const handleRemove = async () => {
    if (!removeItem) return
    setRemoveLoading(true)
    try {
      if (tab === 'students') {
        const { error } = await supabase.from('students').delete().eq('id', removeItem.id)
        if (error) throw error
        reloadData()
      } else if (tab === 'classes') {
        const { error } = await supabase.from('classes').delete().eq('id', removeItem.id)
        if (error) throw error
        setClasses(prev => prev.filter(c => c.id !== removeItem.id))
      } else {
        await supabase.from('teacher_classes').delete().eq('teacher_id', removeItem.id)
        const { error } = await supabase.from('profiles').update({ role: 'deactivated' }).eq('id', removeItem.id)
        if (error) throw error
        await reloadTeachers()
      }
      setRemoveItem(null)
    } catch (e) {
      console.error('Remove failed:', e)
    }
    setRemoveLoading(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="User Management"
        subtitle="Manage students, teachers, classes and credentials."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {tab !== 'classes' && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowImportGuide(true)}>
                  <Upload size={14} /> Import CSV
                </button>
                <input ref={csvFileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleCsvFile} />
              </>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => {
              if (tab === 'classes') { setShowAddClass(true); setClassFormMsg({ type: '', text: '' }) }
              else { setShowAdd(true); setFormMsg({ type: '', text: '' }) }
            }}>
              <Plus size={15} />
              {tab === 'students' ? 'Add Student' : tab === 'teachers' ? 'Add Teacher' : 'Add Class'}
            </button>
          </div>
        }
      />
      <div style={{ padding: '28px 32px' }}>

        {/* Tabs */}
        <div className="tabs" style={{ maxWidth: 400, marginBottom: 24 }}>
          <button className={`tab ${tab === 'students' ? 'active' : ''}`} onClick={() => handleTabChange('students')}>Students</button>
          <button className={`tab ${tab === 'teachers' ? 'active' : ''}`} onClick={() => handleTabChange('teachers')}>Teachers</button>
          <button className={`tab ${tab === 'classes' ? 'active' : ''}`} onClick={() => handleTabChange('classes')}>Classes</button>
        </div>

        {/* ── Classes Tab ─────────────────────────────────────────────────────── */}
        {tab === 'classes' ? (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {['Class Name', 'Grade', 'Section', 'Students', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classesWithCounts.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No classes yet. Click "Add Class" to create your first class.
                  </td></tr>
                ) : classesWithCounts.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, background: 'var(--brand-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BookOpen size={15} color="var(--brand)" />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 13 }}>Grade {c.grade}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13 }}>Section {c.section}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ background: 'var(--brand-light)', color: 'var(--brand)', padding: '3px 10px', borderRadius: 99, fontWeight: 700, fontSize: 12 }}>
                        {c.studentCount} students
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <button className="btn btn-sm" style={{ background: 'var(--accent-red-light)', color: 'var(--accent-red)', border: 'none' }} onClick={() => setRemoveItem(c)}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
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
                    {['Name', tab === 'students' ? 'Roll No' : 'Subject', tab === 'students' ? 'Class' : 'Assigned Class(es)', 'Actions'].map(h => (
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
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {item.email || (tab === 'students'
                                ? `${(item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}.parent@stxaviers.edu.in`
                                : `${(item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}@stxaviers.edu.in`
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600 }}>
                        {tab === 'students' ? (item.roll_no || '—') : (item.teacher_classes?.[0]?.subject || '—')}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13 }}>
                        {tab === 'students'
                          ? (item.classes?.name || '—')
                          : (item.teacher_classes?.length > 0
                            ? item.teacher_classes.map(tc => tc.classes?.name).filter(Boolean).join(', ')
                            : '—')}
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
          </>
        )}

        {createPortal(<>
        {/* ── Add Class Modal ─────────────────────────────────────────────────── */}
        {showAddClass && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowAddClass(false)}>
            <div className="card-lg" style={{ padding: 32, width: 440, background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Add Class</h2>
                <button onClick={() => setShowAddClass(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              {classFormMsg.text && (
                <div style={{ background: classFormMsg.type === 'success' ? 'var(--accent-green-light)' : 'var(--accent-red-light)', color: classFormMsg.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', padding: '12px 14px', borderRadius: 8, fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
                  {classFormMsg.text}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Class Name *</label>
                  <input className="form-input" placeholder="e.g. 10-A, Form 3B, Grade 5 Blue, KG-A…" value={classForm.name} onChange={e => setClassForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>This is what admins and teachers will see, and what the CSV class_name column must match.</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Grade / Year <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input className="form-input" placeholder="e.g. 10, KG, Form 3" value={classForm.grade} onChange={e => setClassForm(f => ({ ...f, grade: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Section <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input className="form-input" placeholder="e.g. A, B, Blue" value={classForm.section} onChange={e => setClassForm(f => ({ ...f, section: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary btn-full btn-lg" onClick={handleAddClass} disabled={classFormLoading}>
                  {classFormLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                  {classFormLoading ? 'Creating…' : 'Create Class'}
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => setShowAddClass(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Add Student/Teacher Modal ───────────────────────────────────────── */}
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
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Class *</label>
                  <select className="form-input form-select" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
                    <option value="">Select a Class...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>Class {c.grade} – {c.name}</option>)}
                  </select>
                </div>
                {tab === 'students' ? (<>
                  <div className="form-group">
                    <label className="form-label">Roll No</label>
                    <input className="form-input" placeholder="Any format (e.g. 01, 2024-01)" value={form.roll_no} onChange={e => setForm(f => ({ ...f, roll_no: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Father's Name</label>
                    <input className="form-input" placeholder="e.g. Mr. Sunil Sharma" value={form.father_name} onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))} />
                  </div>
                </>) : (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Subject</label>
                    <input className="form-input" placeholder="e.g. Mathematics" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
                  </div>
                )}
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

        {/* ── CSV Import Guide Modal ─────────────────────────────────────────── */}
        {showImportGuide && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowImportGuide(false)}>
            <div className="card-lg" style={{ padding: 32, width: 640, background: 'var(--surface)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
                    Import {tab === 'students' ? 'Students' : 'Teachers'} via CSV
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Prepare your spreadsheet using the exact columns below, then upload.
                  </p>
                </div>
                <button onClick={() => setShowImportGuide(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginTop: 2 }}><X size={20} /></button>
              </div>

              {/* Step 1 — column format */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
                  Step 1 — Required columns (in any order)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      {['Column header', 'Required?', 'Description'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(tab === 'students' ? [
                      { col: 'name',         req: true,  desc: 'Student full name' },
                      { col: 'roll_no',      req: false, desc: 'Roll number in any format your school uses — leave blank if not assigned' },
                      { col: 'class_name',   req: true,  desc: 'Must exactly match a class name in this school (see Step 2)' },
                      { col: 'father_name',  req: false, desc: "Father's full name — used on student profile" },
                      { col: 'parent_email', req: true,  desc: 'Parent email — they will receive a login invite at this address' },
                    ] : [
                      { col: 'name',             req: true,  desc: 'Teacher full name' },
                      { col: 'email',            req: true,  desc: 'Teacher email — they will receive a login invite at this address' },
                      { col: 'class_name',       req: true,  desc: 'Must exactly match a class name in this school (see Step 2)' },
                      { col: 'subject',          req: true,  desc: 'Subject they teach (e.g. Mathematics, Science, English)' },
                      { col: 'is_class_teacher', req: false, desc: 'true or false — marks teacher as the primary class teacher' },
                    ]).map(({ col, req, desc }) => (
                      <tr key={col} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <code style={{ background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 12 }}>{col}</code>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {req
                            ? <span style={{ color: 'var(--accent-red)', fontWeight: 700, fontSize: 12 }}>Required</span>
                            : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Optional</span>}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Step 2 — valid class names */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
                  Step 2 — Valid class names for this school
                </div>
                {classes.length === 0 ? (
                  <div style={{ background: 'var(--accent-red-light)', color: 'var(--accent-red)', padding: '12px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                    No classes exist yet. Go to the Classes tab and create your classes first, then come back to import.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {classes.map(c => (
                      <code key={c.id} style={{ background: 'var(--brand-light)', color: 'var(--brand)', padding: '4px 12px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>{c.name}</code>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  The <code style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 3 }}>class_name</code> column must match one of the above exactly (case-insensitive).
                </p>
              </div>

              {/* Step 3 — example row */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
                  Step 3 — Example (first two rows of your CSV)
                </div>
                <pre style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 16px', fontSize: 12, overflowX: 'auto', lineHeight: 1.8, margin: 0, color: 'var(--text)' }}>
                  {tab === 'students'
                    ? `name,roll_no,class_name,father_name,parent_email\nArjun Sharma,01,${classes[0]?.name || 'YourClassName'},Mr. Sunil Sharma,parent@example.com`
                    : `name,email,class_name,subject,is_class_teacher\nMr. Rajesh Iyer,rajesh@school.edu.in,${classes[0]?.name || 'YourClassName'},Mathematics,true`}
                </pre>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost btn-lg" style={{ flex: 1 }} onClick={downloadTemplate}>
                  <Download size={16} /> Download Template
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  style={{ flex: 2 }}
                  disabled={classes.length === 0}
                  onClick={() => { setShowImportGuide(false); csvFileRef.current?.click() }}
                >
                  <Upload size={16} /> Choose File to Upload
                </button>
              </div>
              {classes.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--accent-red)', textAlign: 'center', marginTop: 10 }}>
                  Create at least one class before importing.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── CSV Preview Modal ───────────────────────────────────────────────── */}
        {showCsvPreview && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => { if (!csvImporting) { setShowCsvPreview(false); setCsvRows([]) } }}>
            <div className="card-lg" style={{ padding: 32, width: 800, background: 'var(--surface)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Import Preview</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {csvRows.filter(r => r._status === 'pending').length} ready · {csvRows.filter(r => r._status === 'error').length} with errors · {csvRows.length} total
                  </p>
                </div>
                {!csvImporting && (
                  <button onClick={() => setShowCsvPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                )}
              </div>

              {/* Progress bar */}
              {csvImporting && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    <span>Importing…</span>
                    <span>{csvProgress} / {csvRows.filter(r => r._status !== 'error').length}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 99 }}>
                    <div style={{ height: 8, background: 'var(--brand)', borderRadius: 99, width: `${(csvProgress / Math.max(csvRows.filter(r => r._status !== 'error').length, 1)) * 100}%`, transition: 'width .3s' }} />
                  </div>
                </div>
              )}

              {/* Expected columns hint */}
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {tab === 'students'
                  ? 'Expected: name, roll_no, class_name, father_name, parent_email'
                  : 'Expected: name, email, class_name, subject, is_class_teacher'}
              </div>

              {/* Preview table */}
              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      {['Row', 'Name',
                        ...(tab === 'students' ? ['Roll No', 'Class', 'Parent Email'] : ['Email', 'Class', 'Subject']),
                        'Status'
                      ].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i} style={{
                        borderBottom: '1px solid var(--border)',
                        background: row._status === 'error' ? 'var(--accent-red-light)'
                          : row._status === 'success' ? 'var(--accent-green-light)'
                          : row._status === 'fail' ? '#fff8e1'
                          : 'transparent'
                      }}>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{row._row}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.name || '—'}</td>
                        {tab === 'students' ? (<>
                          <td style={{ padding: '8px 12px' }}>{row.roll_no || '—'}</td>
                          <td style={{ padding: '8px 12px' }}>{row.class_name || '—'}</td>
                          <td style={{ padding: '8px 12px' }}>{row.parent_email || '—'}</td>
                        </>) : (<>
                          <td style={{ padding: '8px 12px' }}>{row.email || '—'}</td>
                          <td style={{ padding: '8px 12px' }}>{row.class_name || '—'}</td>
                          <td style={{ padding: '8px 12px' }}>{row.subject || '—'}</td>
                        </>)}
                        <td style={{ padding: '8px 12px' }}>
                          {row._status === 'success' && (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ color: row._warning ? '#d97706' : 'var(--accent-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={13} /> {row._warning ? 'Imported' : 'Done'}
                              </span>
                              {row._warning && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'block', lineHeight: 1.3 }}>{row._warning}</span>}
                            </div>
                          )}
                          {row._status === 'fail' && <span style={{ color: 'var(--accent-red)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={13} /> {row._errors[0]}</span>}
                          {row._status === 'error' && <span style={{ color: 'var(--accent-red)', fontWeight: 600, fontSize: 12 }}>{row._errors.join(', ')}</span>}
                          {row._status === 'pending' && <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Ready</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-primary btn-lg"
                  style={{ flex: 2 }}
                  onClick={handleCsvImport}
                  disabled={csvImporting || !csvRows.some(r => r._status === 'pending')}
                >
                  {csvImporting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
                  {csvImporting ? 'Importing…' : `Import ${csvRows.filter(r => r._status === 'pending').length} ${tab}`}
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => { setShowCsvPreview(false); setCsvRows([]) }} disabled={csvImporting}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
        {editItem && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setEditItem(null)}>
            <div className="card-lg" style={{ padding: 32, width: 520, background: 'var(--surface)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Edit {tab === 'students' ? 'Student' : 'Teacher'}</h2>
                <button onClick={() => setEditItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              {editMsg.text && (
                <div style={{ background: editMsg.type === 'success' ? 'var(--accent-green-light)' : 'var(--accent-red-light)', color: editMsg.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', padding: '12px 14px', borderRadius: 8, fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
                  {editMsg.text}
                </div>
              )}

              {/* Name field — always shown */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              {/* Student-only fields */}
              {tab === 'students' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
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
                      {classes.map(c => <option key={c.id} value={c.id}>Class {c.grade} – {c.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginBottom: tab === 'teachers' ? 0 : 0 }}>
                <button className="btn btn-primary btn-full btn-lg" onClick={handleEdit} disabled={editLoading}>
                  {editLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  {editLoading ? 'Saving…' : 'Save Name'}
                </button>
                {tab === 'students' && (
                  <button className="btn btn-ghost btn-lg" onClick={() => setEditItem(null)}>Cancel</button>
                )}
              </div>

              {/* ── Teacher Class Assignments section ── */}
              {tab === 'teachers' && (
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 28, paddingTop: 24 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Class Assignments</h3>

                  {assignLoading ? (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
                    </div>
                  ) : teacherAssignments.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>No class assignments yet.</p>
                  ) : (
                    <div style={{ marginBottom: 16 }}>
                      {teacherAssignments.map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{a.classes?.name || 'Unknown class'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                              {a.subject}
                              {a.is_class_teacher && (
                                <span style={{ marginLeft: 8, background: 'var(--brand-light)', color: 'var(--brand)', padding: '2px 8px', borderRadius: 99, fontWeight: 700, fontSize: 11 }}>Class Teacher</span>
                              )}
                            </div>
                          </div>
                          <button className="btn btn-sm" style={{ background: 'var(--accent-red-light)', color: 'var(--accent-red)', border: 'none' }} onClick={() => handleRemoveAssignment(a.id)}>
                            <X size={13} /> Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new assignment form */}
                  <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>Add Assignment</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                      <div>
                        <label className="form-label">Class</label>
                        <select className="form-input form-select" value={newAssign.class_id} onChange={e => setNewAssign(a => ({ ...a, class_id: e.target.value }))}>
                          <option value="">Select class…</option>
                          {classes.map(c => <option key={c.id} value={c.id}>Class {c.grade} – {c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Subject</label>
                        <input className="form-input" placeholder="e.g. Mathematics" value={newAssign.subject} onChange={e => setNewAssign(a => ({ ...a, subject: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={newAssign.is_class_teacher} onChange={e => setNewAssign(a => ({ ...a, is_class_teacher: e.target.checked }))} />
                        Mark as Class Teacher
                      </label>
                      <button className="btn btn-primary btn-sm" onClick={handleAddAssignment} disabled={addAssignLoading}>
                        {addAssignLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                        Add
                      </button>
                    </div>
                  </div>

                  <button className="btn btn-ghost btn-full btn-lg" style={{ marginTop: 20 }} onClick={() => setEditItem(null)}>Close</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Remove Confirmation ─────────────────────────────────────────────── */}
        {removeItem && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setRemoveItem(null)}>
            <div className="card-lg" style={{ padding: 32, width: 420, background: 'var(--surface)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 56, height: 56, background: 'var(--accent-red-light)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Trash2 size={24} color="var(--accent-red)" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Remove {removeItem.name}?</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
                {tab === 'students'
                  ? 'This will permanently delete this student and all their records. This cannot be undone.'
                  : tab === 'classes'
                  ? 'This will delete this class. Students in this class will not be deleted but will need reassignment.'
                  : 'This will deactivate this teacher and remove their class assignments.'}
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
        </>, document.body)}
      </div>
    </div>
  )
}
