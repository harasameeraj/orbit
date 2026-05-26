import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Parse tokens directly from the URL hash (#access_token=...&refresh_token=...)
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token') || ''

    if (accessToken) {
      // Explicitly set the session so updateUser works reliably
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data, error: sessErr }) => {
          if (sessErr || !data?.session) {
            setError('Invalid or expired invite link. Please ask your admin to resend the invite.')
            return
          }
          setEmail(data.session.user?.email || '')
          setSessionReady(true)
          // Remove tokens from URL bar (cleaner UX)
          window.history.replaceState(null, '', window.location.pathname)
        })
    } else {
      // No hash — check if a session already exists
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setEmail(session.user?.email || '')
          setSessionReady(true)
        } else {
          setError('Invalid or expired invite link. Please ask your admin to resend the invite.')
        }
      })
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)

    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) { setError(updateErr.message); setLoading(false); return }

    // Sign out the invite session, then immediately sign in with the new password
    await supabase.auth.signOut()

    if (email) {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInErr && data?.session) {
        // AuthContext will detect the session and redirect to the correct dashboard
        navigate('/', { replace: true })
        return
      }
    }

    // Fallback if sign-in fails for any reason
    navigate('/login', { replace: true, state: { message: 'Password set! Please log in with your new credentials.' } })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)' }}>
      <div className="card-lg" style={{ width: 400, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: 'var(--brand)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>🎓</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Welcome to SchoolConnect</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Set a password to activate your account</p>
        </div>

        {error && !sessionReady ? (
          <div style={{ textAlign: 'center', color: 'var(--accent-red)', fontSize: 14, padding: '16px 0' }}>
            {error}
          </div>
        ) : !sessionReady ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Verifying your invite link…
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {email && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                Setting password for <strong style={{ color: 'var(--text)' }}>{email}</strong>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" placeholder="Repeat your password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            {error && <p style={{ color: 'var(--accent-red)', fontSize: 13, marginTop: 12 }}>{error}</p>}
            <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: 24 }} disabled={loading}>
              {loading ? 'Activating account…' : 'Set Password & Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
