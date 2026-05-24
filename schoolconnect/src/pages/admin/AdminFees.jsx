import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  getFeeStructures, createFeeStructure, updateFeeStructure, deleteFeeStructure,
  getStudentFees, getFeeStats, recordPayment, bulkCreateFeeRecords,
  sendFeeReminder, getFeeReminderHistory,
  getAllStudents, getClassesBySchool,
} from '../../lib/supabase.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import {
  Plus, X, CheckCircle, AlertCircle, IndianRupee, Users, Clock,
  ChevronDown, Search, Send, Bell, Filter, RefreshCw,
  CreditCard, Banknote, Building2, FileText, Trash2, Edit2, Check
} from 'lucide-react'

const FREQ_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual', one_time: 'One Time' }
const STATUS_META = {
  pending:  { label: 'Pending',  color: 'var(--accent-amber)', bg: 'var(--accent-amber-light)' },
  paid:     { label: 'Paid',     color: 'var(--accent-green)', bg: 'var(--accent-green-light)' },
  partial:  { label: 'Partial',  color: 'var(--brand)',        bg: 'var(--brand-light)'        },
  overdue:  { label: 'Overdue',  color: 'var(--accent-red)',   bg: 'var(--accent-red-light)'   },
  waived:   { label: 'Waived',   color: 'var(--text-muted)',   bg: 'var(--surface-2)'          },
}
const PAY_MODES = [
  { value: 'cash',          label: 'Cash',          Icon: Banknote   },
  { value: 'upi',           label: 'UPI',           Icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', Icon: Building2  },
  { value: 'cheque',        label: 'Cheque',        Icon: FileText   },
]

function fmt(n) {
  if (n == null) return '—'
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function AdminFees() {
  const { profile, user } = useAuth()
  const schoolId = profile?.school_id

  const [tab, setTab] = useState('overview')     // 'overview' | 'records' | 'structures' | 'reminders'

  // Data
  const [stats,       setStats]       = useState(null)
  const [structures,  setStructures]  = useState([])
  const [fees,        setFees]        = useState([])
  const [classes,     setClasses]     = useState([])
  const [students,    setStudents]    = useState([])
  const [remHistory,  setRemHistory]  = useState([])

  // Loading/error
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  // Filters
  const [search,         setSearch]         = useState('')
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterClass,    setFilterClass]    = useState('')

  // Modals
  const [showAddStructure,  setShowAddStructure]  = useState(false)
  const [editStructure,     setEditStructure]     = useState(null)
  const [showPayModal,      setShowPayModal]       = useState(null) // fee record
  const [showBulkCreate,    setShowBulkCreate]     = useState(false)
  const [showReminder,      setShowReminder]       = useState(false)

  // Forms
  const [strForm, setStrForm] = useState({ name: '', amount: '', frequency: 'monthly', due_day: 10, description: '', academic_year: '2024-25' })
  const [payForm, setPayForm] = useState({ amount: '', mode: 'upi', receipt: '', remarks: '' })
  const [bulkForm, setBulkForm] = useState({ feeStructureId: '', dueDate: '', classId: '' })
  const [reminderMsg, setReminderMsg] = useState('')

  const showMsg = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const load = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    try {
      const [s, str, f, cls, studs, rh] = await Promise.all([
        getFeeStats(schoolId),
        getFeeStructures(schoolId),
        getStudentFees(schoolId, { status: filterStatus || undefined, classId: filterClass || undefined }),
        getClassesBySchool(schoolId),
        getAllStudents(schoolId),
        getFeeReminderHistory(schoolId),
      ])
      setStats(s)
      setStructures(str)
      setFees(f)
      setClasses(cls || [])
      setStudents(studs || [])
      setRemHistory(rh)
    } catch (e) {
      showMsg('Failed to load fee data: ' + e.message, true)
    }
    setLoading(false)
  }, [schoolId, filterStatus, filterClass])

  useEffect(() => { load() }, [load])

  // ── Fee Structure CRUD ─────────────────────────────────────────────────────
  const saveStructure = async () => {
    if (!strForm.name || !strForm.amount) return showMsg('Name and amount are required.', true)
    setSaving(true)
    try {
      if (editStructure) {
        await updateFeeStructure(editStructure.id, { ...strForm, amount: Number(strForm.amount) })
      } else {
        await createFeeStructure({ ...strForm, amount: Number(strForm.amount), school_id: schoolId })
      }
      setShowAddStructure(false); setEditStructure(null)
      setStrForm({ name: '', amount: '', frequency: 'monthly', due_day: 10, description: '', academic_year: '2024-25' })
      showMsg(editStructure ? 'Fee structure updated.' : 'Fee structure created.')
      load()
    } catch (e) { showMsg(e.message, true) }
    setSaving(false)
  }

  const deleteStructure = async (id) => {
    if (!confirm('Archive this fee structure?')) return
    try { await deleteFeeStructure(id); showMsg('Archived.'); load() }
    catch (e) { showMsg(e.message, true) }
  }

  const openEditStructure = (str) => {
    setStrForm({ name: str.name, amount: str.amount, frequency: str.frequency, due_day: str.due_day, description: str.description || '', academic_year: str.academic_year })
    setEditStructure(str)
    setShowAddStructure(true)
  }

  // ── Record payment ─────────────────────────────────────────────────────────
  const savePayment = async () => {
    if (!payForm.amount || isNaN(payForm.amount)) return showMsg('Enter a valid amount.', true)
    setSaving(true)
    try {
      await recordPayment(showPayModal.id, {
        amountPaid:  Number(payForm.amount),
        paymentMode: payForm.mode,
        receiptNo:   payForm.receipt || null,
        remarks:     payForm.remarks || null,
      })
      setShowPayModal(null)
      setPayForm({ amount: '', mode: 'upi', receipt: '', remarks: '' })
      showMsg('Payment recorded.')
      load()
    } catch (e) { showMsg(e.message, true) }
    setSaving(false)
  }

  // ── Bulk create fee records ────────────────────────────────────────────────
  const saveBulkCreate = async () => {
    if (!bulkForm.feeStructureId || !bulkForm.dueDate) return showMsg('Select fee type and due date.', true)
    setSaving(true)
    try {
      const targetStudents = bulkForm.classId
        ? students.filter(s => s.class_id === bulkForm.classId)
        : students
      if (!targetStudents.length) return showMsg('No students found.', true)
      await bulkCreateFeeRecords(schoolId, bulkForm.feeStructureId, targetStudents.map(s => s.id), bulkForm.dueDate)
      setShowBulkCreate(false)
      setBulkForm({ feeStructureId: '', dueDate: '', classId: '' })
      showMsg(`Created fee records for ${targetStudents.length} students.`)
      load()
    } catch (e) { showMsg(e.message, true) }
    setSaving(false)
  }

  // ── Send reminder ──────────────────────────────────────────────────────────
  const sendReminder = async () => {
    if (!reminderMsg.trim()) return showMsg('Enter a message.', true)
    setSaving(true)
    try {
      const pendingCount = fees.filter(f => f.status === 'pending' || f.status === 'overdue').length
      await sendFeeReminder(schoolId, user.id, reminderMsg.trim(), pendingCount)
      setReminderMsg('')
      setShowReminder(false)
      showMsg(`Reminder sent to ${pendingCount} families.`)
      load()
    } catch (e) { showMsg(e.message, true) }
    setSaving(false)
  }

  // ── Filtered fees ──────────────────────────────────────────────────────────
  const filteredFees = fees.filter(f => {
    const q = search.toLowerCase()
    const name = f.students?.name?.toLowerCase() || ''
    const roll = f.students?.roll_no?.toLowerCase() || ''
    return name.includes(q) || roll.includes(q)
  })

  const TABS = [
    { id: 'overview',    label: 'Overview' },
    { id: 'records',     label: 'Payment Records' },
    { id: 'structures',  label: 'Fee Structures' },
    { id: 'reminders',   label: 'Reminders' },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader title="Fee Management" subtitle="Track collections, manage structures, send reminders">
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => setShowBulkCreate(true)}>
          <Plus size={16} /> Generate Fee Records
        </button>
        <button className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}
          onClick={() => setShowReminder(true)}>
          <Bell size={16} /> Send Reminder
        </button>
      </PageHeader>

      <div style={{ padding: '0 32px 32px' }}>

        {/* Toast */}
        {(error || success) && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 20,
            background: error ? 'var(--accent-red-light)' : 'var(--accent-green-light)',
            color: error ? 'var(--accent-red)' : 'var(--accent-green)',
            fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {error ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {error || success}
          </div>
        )}

        {/* KPI cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Billed',     value: fmt(stats.total),     sub: 'this year',          color: 'var(--brand)',         icon: IndianRupee },
              { label: 'Collected',        value: fmt(stats.collected), sub: `${stats.paidCount || 0} records paid`, color: 'var(--accent-green)', icon: CheckCircle },
              { label: 'Pending / Due',    value: fmt(stats.pending),   sub: `${stats.overdue || 0} overdue`,        color: 'var(--accent-amber)', icon: Clock },
              { label: 'Collection Rate',  value: stats.total ? `${Math.round((stats.collected / stats.total) * 100)}%` : '—', sub: 'of total billed', color: 'var(--accent-green)', icon: Users },
            ].map(({ label, value, sub, color, icon: Icon }) => (
              <div key={label} className="card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: .5, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color={color} />
                  </div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 12, padding: 4, marginBottom: 24, width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, transition: 'all .15s',
              background: tab === t.id ? 'var(--surface)' : 'transparent',
              color: tab === t.id ? 'var(--brand)' : 'var(--text-secondary)',
              boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
            }}>{t.label}</button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
            Loading fee data…
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {!loading && tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Collection breakdown by status */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Status Breakdown</div>
              {['paid','pending','overdue','partial','waived'].map(status => {
                const count = fees.filter(f => f.status === status).length
                const amount = fees.filter(f => f.status === status).reduce((s, f) => s + Number(f.amount_due), 0)
                const meta = STATUS_META[status]
                if (!count) return null
                return (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color }} />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{meta.label}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>({count})</span>
                    </div>
                    <span style={{ fontWeight: 700, color: meta.color }}>{fmt(amount)}</span>
                  </div>
                )
              })}
            </div>

            {/* Class-wise collection */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Class-wise Collection</div>
              {classes.map(cls => {
                const clsFees  = fees.filter(f => f.students?.class_id === cls.id)
                const collected = clsFees.reduce((s, f) => s + Number(f.amount_paid), 0)
                const due       = clsFees.reduce((s, f) => s + Number(f.amount_due), 0)
                const pct = due > 0 ? Math.round((collected / due) * 100) : 0
                if (!clsFees.length) return null
                return (
                  <div key={cls.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{cls.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 75 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99 }}>
                      <div style={{ height: 6, width: `${pct}%`, borderRadius: 99, background: pct >= 75 ? 'var(--accent-green)' : 'var(--accent-amber)', transition: 'width .3s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{fmt(collected)} collected of {fmt(due)}</div>
                  </div>
                )
              })}
              {!classes.filter(c => fees.some(f => f.students?.class_id === c.id)).length && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>No data yet</div>
              )}
            </div>

            {/* Overdue students */}
            <div className="card" style={{ padding: 24, gridColumn: '1 / -1' }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
                Overdue Records
                <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: 'var(--accent-red)' }}>
                  ({fees.filter(f => f.status === 'overdue').length})
                </span>
              </div>
              {fees.filter(f => f.status === 'overdue').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>No overdue records 🎉</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {fees.filter(f => f.status === 'overdue').slice(0, 12).map(f => (
                    <div key={f.id} style={{ background: 'var(--accent-red-light)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{f.students?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.fee_structures?.name} • Due {f.due_date}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-red)', fontSize: 15 }}>{fmt(Number(f.amount_due) - Number(f.amount_paid))}</div>
                        <button onClick={() => setShowPayModal(f)} style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>
                          Record Payment →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PAYMENT RECORDS TAB ── */}
        {!loading && tab === 'records' && (
          <div>
            {/* Filters */}
            <div className="card" style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search student name or roll…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-input" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className="form-input" style={{ width: 'auto' }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={load} style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={15} />
              </button>
            </div>

            {/* Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Student', 'Class', 'Fee Type', 'Amount Due', 'Paid', 'Balance', 'Due Date', 'Status', ''].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: .5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFees.length === 0 && (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No records found</td></tr>
                    )}
                    {filteredFees.map(f => {
                      const meta    = STATUS_META[f.status] || STATUS_META.pending
                      const balance = Number(f.amount_due) - Number(f.amount_paid)
                      return (
                        <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '12px 16px', fontWeight: 700 }}>{f.students?.name || '—'}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{f.students?.classes?.name || '—'}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{f.fee_structures?.name || '—'}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700 }}>{fmt(f.amount_due)}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--accent-green)', fontWeight: 600 }}>{fmt(f.amount_paid)}</td>
                          <td style={{ padding: '12px 16px', color: balance > 0 ? 'var(--accent-red)' : 'var(--text-muted)', fontWeight: 700 }}>{balance > 0 ? fmt(balance) : '—'}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{f.due_date}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: meta.bg, color: meta.color, whiteSpace: 'nowrap' }}>
                              {meta.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {f.status !== 'paid' && f.status !== 'waived' && (
                              <button onClick={() => setShowPayModal(f)} style={{ background: 'var(--brand-light)', color: 'var(--brand)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                                Record Pay
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── FEE STRUCTURES TAB ── */}
        {!loading && tab === 'structures' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
              <button className="btn btn-primary" onClick={() => { setEditStructure(null); setStrForm({ name: '', amount: '', frequency: 'monthly', due_day: 10, description: '', academic_year: '2024-25' }); setShowAddStructure(true) }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={16} /> Add Fee Type
              </button>
            </div>

            {structures.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <IndianRupee size={40} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-muted)', opacity: .4 }} />
                <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>No fee structures yet</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Create fee types like Tuition, Transport, Library, etc.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {structures.map(str => (
                  <div key={str.id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{str.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{FREQ_LABELS[str.frequency]} • AY {str.academic_year}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEditStructure(str)} style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Edit2 size={14} color="var(--text-secondary)" />
                        </button>
                        <button onClick={() => deleteStructure(str.id)} style={{ background: 'var(--accent-red-light)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={14} color="var(--accent-red)" />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--brand)', marginBottom: 8 }}>₹{Number(str.amount).toLocaleString('en-IN')}</div>
                    {str.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{str.description}</div>}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Due on day {str.due_day} of each period</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REMINDERS TAB ── */}
        {!loading && tab === 'reminders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
              <button className="btn btn-primary" onClick={() => setShowReminder(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={16} /> Send Reminder
              </button>
            </div>

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Pending Families', value: fees.filter(f => f.status === 'pending').length, color: 'var(--accent-amber)' },
                { label: 'Overdue',          value: fees.filter(f => f.status === 'overdue').length, color: 'var(--accent-red)'   },
                { label: 'Reminders Sent',   value: remHistory.length, color: 'var(--brand)'         },
              ].map(({ label, value, color }) => (
                <div key={label} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color }}>{value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Reminder history */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Reminder History</div>
              {remHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>No reminders sent yet</div>
              ) : remHistory.map(r => (
                <div key={r.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bell size={16} color="var(--brand)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{r.message}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Sent by {r.profiles?.name || 'Admin'} • {new Date(r.sent_at).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {r.recipient_count} recipients
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: Add/Edit Fee Structure ── */}
      {showAddStructure && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowAddStructure(false)}>
          <div className="card-lg" style={{ width: 500, background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{editStructure ? 'Edit' : 'Add'} Fee Structure</div>
              <button onClick={() => setShowAddStructure(false)} style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Fee Name *</label>
                <input className="form-input" placeholder="e.g. Tuition Fee, Transport Fee" value={strForm.name} onChange={e => setStrForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="form-label">Amount (₹) *</label>
                  <input className="form-input" type="number" placeholder="5000" value={strForm.amount} onChange={e => setStrForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Frequency</label>
                  <select className="form-input" value={strForm.frequency} onChange={e => setStrForm(p => ({ ...p, frequency: e.target.value }))}>
                    {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="form-label">Academic Year</label>
                  <input className="form-input" placeholder="2024-25" value={strForm.academic_year} onChange={e => setStrForm(p => ({ ...p, academic_year: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Due Day of Month</label>
                  <input className="form-input" type="number" min={1} max={31} value={strForm.due_day} onChange={e => setStrForm(p => ({ ...p, due_day: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Description (optional)</label>
                <textarea className="form-input form-textarea" rows={2} placeholder="Additional details…" value={strForm.description} onChange={e => setStrForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <button className="btn btn-primary" onClick={saveStructure} disabled={saving} style={{ opacity: saving ? .6 : 1 }}>
                {saving ? 'Saving…' : editStructure ? 'Update Structure' : 'Create Structure'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Record Payment ── */}
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowPayModal(null)}>
          <div className="card-lg" style={{ width: 460, background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Record Payment</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{showPayModal.students?.name} — {showPayModal.fee_structures?.name}</div>
              </div>
              <button onClick={() => setShowPayModal(null)} style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24 }}>
              {/* Summary */}
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 16, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
                {[
                  ['Total Due', fmt(showPayModal.amount_due), 'var(--text-primary)'],
                  ['Paid So Far', fmt(showPayModal.amount_paid), 'var(--accent-green)'],
                  ['Balance', fmt(Number(showPayModal.amount_due) - Number(showPayModal.amount_paid)), 'var(--accent-red)'],
                ].map(([l, v, c]) => (
                  <div key={l}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>{l.toUpperCase()}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Amount Being Paid (₹) *</label>
                  <input className="form-input" type="number" placeholder={String(Number(showPayModal.amount_due) - Number(showPayModal.amount_paid))} value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Payment Mode</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {PAY_MODES.map(({ value, label, Icon: Ico }) => (
                      <button key={value} onClick={() => setPayForm(p => ({ ...p, mode: value }))} style={{
                        padding: '10px 14px', borderRadius: 10, border: `2px solid ${payForm.mode === value ? 'var(--brand)' : 'var(--border)'}`,
                        background: payForm.mode === value ? 'var(--brand-light)' : 'var(--surface-2)',
                        color: payForm.mode === value ? 'var(--brand)' : 'var(--text-secondary)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13,
                      }}>
                        <Ico size={15} /> {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label">Receipt No. (optional)</label>
                    <input className="form-input" placeholder="RCP-2024-001" value={payForm.receipt} onChange={e => setPayForm(p => ({ ...p, receipt: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Remarks (optional)</label>
                    <input className="form-input" placeholder="Cheque no., note…" value={payForm.remarks} onChange={e => setPayForm(p => ({ ...p, remarks: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={savePayment} disabled={saving} style={{ opacity: saving ? .6 : 1 }}>
                  {saving ? 'Recording…' : <><Check size={16} /> Confirm Payment</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Bulk Create Fee Records ── */}
      {showBulkCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowBulkCreate(false)}>
          <div className="card-lg" style={{ width: 500, background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Generate Fee Records</div>
              <button onClick={() => setShowBulkCreate(false)} style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--brand-light)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--brand)', fontWeight: 600 }}>
                This will create individual payment records for all selected students.
              </div>
              <div>
                <label className="form-label">Fee Structure *</label>
                <select className="form-input" value={bulkForm.feeStructureId} onChange={e => setBulkForm(p => ({ ...p, feeStructureId: e.target.value }))}>
                  <option value="">Select a fee type…</option>
                  {structures.map(s => <option key={s.id} value={s.id}>{s.name} — ₹{Number(s.amount).toLocaleString('en-IN')}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Class (leave blank for all students)</label>
                <select className="form-input" value={bulkForm.classId} onChange={e => setBulkForm(p => ({ ...p, classId: e.target.value }))}>
                  <option value="">All Classes ({students.length} students)</option>
                  {classes.map(c => {
                    const cnt = students.filter(s => s.class_id === c.id).length
                    return <option key={c.id} value={c.id}>{c.name} ({cnt} students)</option>
                  })}
                </select>
              </div>
              <div>
                <label className="form-label">Due Date *</label>
                <input className="form-input" type="date" value={bulkForm.dueDate} onChange={e => setBulkForm(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
              <button className="btn btn-primary" onClick={saveBulkCreate} disabled={saving} style={{ opacity: saving ? .6 : 1 }}>
                {saving ? 'Creating…' : `Generate Records for ${bulkForm.classId ? students.filter(s => s.class_id === bulkForm.classId).length : students.length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Send Reminder ── */}
      {showReminder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowReminder(false)}>
          <div className="card-lg" style={{ width: 460, background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Send Fee Reminder</div>
              <button onClick={() => setShowReminder(false)} style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ background: 'var(--accent-amber-light)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--accent-amber)', fontWeight: 600, marginBottom: 20 }}>
                Will notify {fees.filter(f => f.status === 'pending' || f.status === 'overdue').length} families with pending/overdue fees via push notification.
              </div>
              <div>
                <label className="form-label">Message</label>
                <textarea className="form-input form-textarea" rows={4}
                  placeholder="Dear Parent, this is a reminder that your fee payment is due. Kindly pay at the earliest. — School Administration"
                  value={reminderMsg}
                  onChange={e => setReminderMsg(e.target.value)}
                  style={{ marginBottom: 16, resize: 'vertical' }}
                />
              </div>
              {/* Quick message templates */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>TEMPLATES</div>
                {[
                  'Dear Parent, your fee payment is due. Please clear dues at the earliest to avoid penalties.',
                  'Reminder: Q3 fees are due. Please visit the school office or pay online. Thank you.',
                ].map((tmpl, i) => (
                  <button key={i} onClick={() => setReminderMsg(tmpl)} style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8,
                    background: 'var(--surface-2)', border: 'none', marginBottom: 8, cursor: 'pointer',
                    fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font)', lineHeight: 1.4,
                  }}>
                    {tmpl}
                  </button>
                ))}
              </div>
              <button className="btn btn-primary btn-full" onClick={sendReminder} disabled={saving || !reminderMsg.trim()} style={{ opacity: (saving || !reminderMsg.trim()) ? .6 : 1 }}>
                {saving ? 'Sending…' : <><Send size={16} /> Send Reminder</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
