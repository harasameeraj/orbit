import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../shared/NotificationBell.jsx'

export default function PageHeader({ title, subtitle, action }) {
  const { user, profile } = useAuth()
  const showBell = profile?.role === 'teacher' || profile?.role === 'parent'

  return (
    <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
      <div>
        {title && <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h1>}
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {action}
        {showBell && <NotificationBell />}
        <div className="avatar avatar-sm" style={{ background: 'var(--brand-light)', color: 'var(--brand)', fontWeight: 700 }}>
          {(profile?.name || user?.email || '?').charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
