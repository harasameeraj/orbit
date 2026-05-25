import { Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

export default function PageHeader({ title, subtitle, action }) {
  const { user, profile } = useAuth()
  return (
    <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
      <div>
        {title && <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h1>}
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {action}
        <button style={{ position: 'relative', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <Bell size={18} />
          <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: 'var(--accent-red)', borderRadius: '50%', border: '2px solid white' }} />
        </button>
        <div className="avatar avatar-sm" style={{ background: 'var(--brand-light)', color: 'var(--brand)', fontWeight: 700 }}>
          {(profile?.name || user?.email || '?').charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
