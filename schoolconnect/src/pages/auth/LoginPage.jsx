import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { getStoredSchool, clearStoredSchool } from './SchoolCodePage.jsx'
import { Eye, EyeOff, GraduationCap, Loader2, ChevronLeft } from 'lucide-react'

export default function LoginPage() {
  const { login, loading, error, user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.message
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [school, setSchool] = useState(null)

  // Load selected school from localStorage
  useEffect(() => {
    const stored = getStoredSchool()
    if (!stored) {
      navigate('/', { replace: true })
      return
    }
    setSchool(stored)
  }, [])

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === 'admin') navigate('/admin', { replace: true })
      else if (profile.role === 'teacher') navigate('/teacher', { replace: true })
      else navigate('/parent', { replace: true })
    }
  }, [loading, user, profile, navigate])

  const brandColor = school?.brand_color || '#1a3a6b'

  // Only show demo buttons for St. Xavier's
  const isDemo = school?.code === 'STXAV'
  const DEMO = [
    { label: 'Admin', email: 'admin@stxaviers.edu.in', password: 'Admin@1234', color: '#7c3aed' },
    { label: 'Teacher', email: 'teacher@stxaviers.edu.in', password: 'Teacher@1234', color: '#0891b2' },
    { label: 'Parent', email: 'parent@stxaviers.edu.in', password: 'Parent@1234', color: '#16a34a' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    await login(email, password)
  }

  const handleChangeSchool = () => {
    clearStoredSchool()
    navigate('/', { replace: true })
  }

  const fillDemo = (d) => { setEmail(d.email); setPassword(d.password) }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {/* Left: Brand panel — uses school's brand color */}
      <div style={{ background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}cc 60%, ${brandColor}aa 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,.03) 0%, transparent 50%)' }} />
        <div style={{ position: 'relative', textAlign: 'center', color: 'white', maxWidth: 400 }}>
          <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,.15)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.2)' }}>
            <GraduationCap size={40} color="white" />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.5px' }}>SchoolConnect</h1>
          <p style={{ fontSize: 16, opacity: .75, lineHeight: 1.7, marginBottom: 48 }}>
            The all-in-one platform connecting parents, teachers, and school administration.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, textAlign: 'left' }}>
            {['Real-time Attendance', 'Daily Reports', 'Parent-Teacher Chat', 'Smart Analytics'].map(f => (
              <div key={f} style={{ background: 'rgba(255,255,255,.08)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,.12)', fontSize: 13, fontWeight: 600 }}>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* School name + change school */}
          {school && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={16} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{school.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{school.code}</div>
                </div>
              </div>
              <button onClick={handleChangeSchool} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <ChevronLeft size={14} /> Change
              </button>
            </div>
          )}

          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Welcome back</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Sign in to your account to continue</p>

          {/* Demo buttons — only for St. Xavier's */}
          {isDemo && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Quick demo access</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {DEMO.map(d => (
                  <button type="button" key={d.label} onClick={() => fillDemo(d)} style={{ flex: 1, padding: '9px 0', border: `1.5px solid ${d.color}`, borderRadius: 8, background: 'transparent', color: d.color, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={e => e.target.style.background = d.color + '15'}
                    onMouseLeave={e => e.target.style.background = 'transparent'}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" placeholder="you@school.edu.in" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {successMessage && <div style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)', padding: '10px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>{successMessage}</div>}
            {error && <div style={{ background: 'var(--accent-red-light)', color: 'var(--accent-red)', padding: '10px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>{error}</div>}
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ background: brandColor, borderColor: brandColor }}>
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
            {school?.name || 'SchoolConnect'} • SchoolConnect v1.0
          </p>
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: '1fr 1fr'"] { grid-template-columns: 1fr !important; }
          div[style*="background: linear-gradient"] { display: none !important; }
        }
      `}</style>
    </div>
  )
}
