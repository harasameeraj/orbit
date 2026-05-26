import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { getSchoolByCode } from '../../lib/supabase.js'
import { GraduationCap, Loader2, ArrowRight } from 'lucide-react'

export const SCHOOL_STORAGE_KEY = 'sc_selected_school'

export function getStoredSchool() {
  try { return JSON.parse(localStorage.getItem(SCHOOL_STORAGE_KEY)) } catch { return null }
}

export function storeSchool(school) {
  localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(school))
}

export function clearStoredSchool() {
  localStorage.removeItem(SCHOOL_STORAGE_KEY)
}

export default function SchoolCodePage() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [savedSchool, setSavedSchool] = useState(null)

  // If already logged in, skip straight to dashboard
  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === 'admin') navigate('/admin', { replace: true })
      else if (profile.role === 'teacher') navigate('/teacher', { replace: true })
      else navigate('/parent', { replace: true })
    }
  }, [loading, user, profile, navigate])

  // If a school was previously selected, show it as a shortcut
  useEffect(() => {
    const stored = getStoredSchool()
    if (stored) setSavedSchool(stored)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setChecking(true)
    setError('')
    const school = await getSchoolByCode(code.trim())
    if (!school) {
      setError('School code not found. Please check with your school admin.')
      setChecking(false)
      return
    }
    storeSchool(school)
    navigate('/login')
  }

  const continueWithSaved = () => navigate('/login')

  if (loading) return null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)' }}>
      <div style={{ width: '100%', maxWidth: 440, padding: '0 24px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, background: '#1a3a6b', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <GraduationCap size={32} color="white" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a3a6b', marginBottom: 6 }}>SchoolConnect</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Enter your school code to continue</p>
        </div>

        {/* Previously selected school shortcut */}
        {savedSchool && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Continue as</p>
            <button
              onClick={continueWithSaved}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'white', border: `2px solid ${savedSchool.brand_color || '#1a3a6b'}`, borderRadius: 12, cursor: 'pointer', transition: 'all .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: savedSchool.brand_color || '#1a3a6b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={18} color="white" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{savedSchool.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{savedSchool.code}</div>
                </div>
              </div>
              <ArrowRight size={18} color={savedSchool.brand_color || '#1a3a6b'} />
            </button>
          </div>
        )}

        {/* Divider */}
        {savedSchool && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or enter a different code</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        )}

        {/* School code form */}
        <div style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">School Code</label>
              <input
                className="form-input"
                placeholder="e.g. STXAV"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
                style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center' }}
                autoFocus
                maxLength={10}
              />
              {error && <p style={{ color: 'var(--accent-red)', fontSize: 13, marginTop: 8 }}>{error}</p>}
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={checking || !code.trim()}>
              {checking ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={18} />}
              {checking ? 'Checking…' : 'Continue'}
            </button>
          </form>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
            Your school code was provided by your school admin.<br />
            Contact them if you don't have it.
          </p>
        </div>

        {/* Demo codes hint */}
        <div style={{ marginTop: 24, background: 'rgba(255,255,255,.7)', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Demo school codes</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { code: 'STXAV', name: "St. Xavier's", color: '#1a3a6b' },
              { code: 'GRWDS', name: 'Greenwood', color: '#16a34a' },
              { code: 'SUNRS', name: 'Sunrise', color: '#d97706' },
              { code: 'DPACD', name: 'Delhi Public', color: '#7c3aed' },
            ].map(s => (
              <button key={s.code} type="button"
                onClick={() => setCode(s.code)}
                style={{ padding: '4px 12px', borderRadius: 99, border: `1.5px solid ${s.color}`, background: 'transparent', color: s.color, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 1 }}>
                {s.code}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
