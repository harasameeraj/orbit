import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { supabase } from '../../lib/supabase.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { CreditCard, IndianRupee, Clock, CheckCircle, ArrowRight, X, Sparkles, Send } from 'lucide-react'

function fmt(n) {
  if (n == null) return '—'
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const STATUS_META = {
  pending:  { label: 'Pending',  color: 'var(--accent-amber)', bg: 'var(--accent-amber-light)' },
  paid:     { label: 'Paid',     color: 'var(--accent-green)', bg: 'var(--accent-green-light)' },
  partial:  { label: 'Partial',  color: 'var(--brand)',        bg: 'var(--brand-light)'        },
  overdue:  { label: 'Overdue',  color: 'var(--accent-red)',   bg: 'var(--accent-red-light)'   },
  waived:   { label: 'Waived',   color: 'var(--text-muted)',   bg: 'var(--surface-2)'          },
}

export default function ParentFees() {
  const { profile } = useAuth()
  const { students, announcements } = useData()
  const student = students[0] || {}

  const [fees, setFees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPayModal, setShowPayModal] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [payForm, setPayForm] = useState({ cardNo: '', expiry: '', cvv: '', upiId: '', mode: 'upi' })

  // Fetch fees for the student
  const fetchFees = async () => {
    if (!student.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('student_fees')
        .select(`
          *,
          fee_structures(id, name, amount, frequency)
        `)
        .eq('student_id', student.id)
        .order('due_date', { ascending: false })
      if (error) throw error
      setFees(data || [])
    } catch (e) {
      console.error('Failed to load student fees:', e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFees()
  }, [student.id])

  // Filter fee announcements
  const feeAnnouncements = announcements.filter(ann => 
    ann.title?.toLowerCase().includes('fee') || 
    ann.body?.toLowerCase().includes('fee') || 
    ann.body?.toLowerCase().includes('pay')
  )

  // Calculations
  const totalBilled = fees.reduce((sum, f) => sum + Number(f.amount_due), 0)
  const totalPaid = fees.reduce((sum, f) => sum + Number(f.amount_paid), 0)
  const totalOutstanding = totalBilled - totalPaid

  const handleSimulatePayment = (feeRecord) => {
    // Show paying modal
    setShowPayModal(feeRecord)
  }

  const confirmPayment = () => {
    // Simulate updating state locally
    const updatedFees = fees.map(f => {
      if (f.id === showPayModal.id) {
        return {
          ...f,
          amount_paid: f.amount_due,
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
          payment_mode: payForm.mode,
        }
      }
      return f
    })
    setFees(updatedFees)
    setShowPayModal(null)
    setPayForm({ cardNo: '', expiry: '', cvv: '', upiId: '', mode: 'upi' })
    setSuccessMsg('✓ Payment simulated successfully! State updated locally for demonstration.')
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Fees & Payment" subtitle={`Manage school fees for ${student.name || 'your child'}`} />
      
      <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>

        {successMsg && (
          <div style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)', padding: '14px 20px', borderRadius: 10, marginBottom: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} /> {successMsg}
          </div>
        )}

        {/* Dues Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Billed', value: fmt(totalBilled), sub: 'Academic Year', color: 'var(--brand)', icon: IndianRupee },
            { label: 'Total Paid', value: fmt(totalPaid), sub: 'Received so far', color: 'var(--accent-green)', icon: CheckCircle },
            { label: 'Outstanding Balance', value: fmt(totalOutstanding), sub: 'Due immediately', color: totalOutstanding > 0 ? 'var(--accent-red)' : 'var(--text-muted)', icon: Clock },
          ].map(({ label, value, sub, color, icon: Icon }) => (
            <div key={label} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color={color} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Fee structure table */}
        <div className="card" style={{ overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 15 }}>
            Fee Schedule
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading fee details...</div>
          ) : fees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>No fee records found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {['Fee Description', 'Amount Due', 'Amount Paid', 'Due Date', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fees.map(f => {
                  const meta = STATUS_META[f.status] || STATUS_META.pending
                  const balance = Number(f.amount_due) - Number(f.amount_paid)
                  return (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        <div>{f.fee_structures?.name || 'School Fee'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>
                          {f.fee_structures?.frequency ? f.fee_structures.frequency.toUpperCase() : 'ONCE'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>{fmt(f.amount_due)}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--accent-green)', fontWeight: 600 }}>{fmt(f.amount_paid)}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{f.due_date}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {balance > 0 && f.status !== 'waived' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleSimulatePayment(f)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            Pay Now <ArrowRight size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Fee announcements / notifications */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Fee & Payment Announcements</div>
          {feeAnnouncements.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>No fee announcements from administration.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {feeAnnouncements.map(ann => (
                <div key={ann.id} style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 10, borderLeft: '4px solid var(--brand)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {ann.title}
                    {ann.is_urgent && <span className="badge badge-red" style={{ fontSize: 10 }}>Urgent</span>}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{ann.body}</p>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    Posted {new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* simulated payment modal */}
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowPayModal(null)}>
          <div className="card-lg" style={{ width: 440, background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>Payment Gateway Sim</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Paying: {showPayModal.fee_structures?.name}</div>
              </div>
              <button onClick={() => setShowPayModal(null)} style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
            </div>
            
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--brand-light)', color: 'var(--brand)', padding: '12px 16px', borderRadius: 10, fontWeight: 700, fontSize: 15, marginBottom: 20 }}>
                <span>Amount to Pay:</span>
                <span>{fmt(Number(showPayModal.amount_due) - Number(showPayModal.amount_paid))}</span>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Payment Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button onClick={() => setPayForm(p => ({ ...p, mode: 'upi' }))} style={{
                    padding: '10px 0', borderRadius: 8, border: `2px solid ${payForm.mode === 'upi' ? 'var(--brand)' : 'var(--border)'}`,
                    background: payForm.mode === 'upi' ? 'var(--brand-light)' : 'transparent',
                    color: payForm.mode === 'upi' ? 'var(--brand)' : 'var(--text-secondary)',
                    fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)'
                  }}>UPI ID</button>
                  <button onClick={() => setPayForm(p => ({ ...p, mode: 'card' }))} style={{
                    padding: '10px 0', borderRadius: 8, border: `2px solid ${payForm.mode === 'card' ? 'var(--brand)' : 'var(--border)'}`,
                    background: payForm.mode === 'card' ? 'var(--brand-light)' : 'transparent',
                    color: payForm.mode === 'card' ? 'var(--brand)' : 'var(--text-secondary)',
                    fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)'
                  }}>Credit / Debit Card</button>
                </div>
              </div>

              {payForm.mode === 'upi' ? (
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">UPI ID *</label>
                  <input className="form-input" placeholder="username@upi" value={payForm.upiId} onChange={e => setPayForm(p => ({ ...p, upiId: e.target.value }))} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                  <div className="form-group">
                    <label className="form-label">Card Number *</label>
                    <input className="form-input" placeholder="4111 2222 3333 4444" value={payForm.cardNo} onChange={e => setPayForm(p => ({ ...p, cardNo: e.target.value }))} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Expiry (MM/YY) *</label>
                      <input className="form-input" placeholder="12/28" value={payForm.expiry} onChange={e => setPayForm(p => ({ ...p, expiry: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CVV *</label>
                      <input className="form-input" type="password" placeholder="123" value={payForm.cvv} onChange={e => setPayForm(p => ({ ...p, cvv: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}

              <button className="btn btn-primary btn-full btn-lg" onClick={confirmPayment} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Send size={16} /> Simulate Success Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
