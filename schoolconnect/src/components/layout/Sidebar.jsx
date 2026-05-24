import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { GraduationCap, LogOut } from 'lucide-react'

export default function Sidebar({ links, role }) {
  const { user, logout } = useAuth()

  const roleColors = { admin: '#7c3aed', teacher: 'var(--brand)', parent: '#16a34a' }
  const roleColor = roleColors[role] || 'var(--brand)'

  return (
    <aside style={{ width: 240, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: roleColor, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>SchoolConnect</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'capitalize' }}>{role} Portal</div>
          </div>
        </div>
      </div>

      {/* User */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar" style={{ background: roleColor + '20', color: roleColor }}>{user?.name?.charAt(0)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            {user?.class && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Class {user.class}</div>}
            {user?.school && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.school}</div>}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {links.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === `/${role}` || to === '/admin'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600, transition: 'all .15s',
              background: isActive ? roleColor + '15' : 'transparent',
              color: isActive ? roleColor : 'var(--text-secondary)',
              borderLeft: isActive ? `3px solid ${roleColor}` : '3px solid transparent',
            })}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--accent-red)', transition: 'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-red-light)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
