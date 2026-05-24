import { useAuth } from '../../context/AuthContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { LogOut, Mail, BookOpen, Users, Star } from 'lucide-react'

export default function TeacherProfile() {
  const { user, logout } = useAuth()
  return (
    <div className="animate-fade-in">
      <PageHeader title="Profile" />
      <div style={{ padding: '28px 32px', maxWidth: 600, margin: '0 auto' }}>
        <div className="card-lg" style={{ padding: 32, textAlign: 'center', marginBottom: 24 }}>
          <div className="avatar avatar-xl" style={{ background: 'var(--brand-light)', color: 'var(--brand)', fontWeight: 800, margin: '0 auto 16px', fontSize: 32 }}>
            {user?.name?.charAt(0)}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{user?.name}</h2>
          <span className="badge badge-brand">{user?.subject} Teacher</span>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>Class {user?.class} • St. Xavier's International Academy</div>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { Icon: Mail, label: 'Email', value: user?.email },
              { Icon: BookOpen, label: 'Subject', value: user?.subject },
              { Icon: Users, label: 'Class', value: `Class ${user?.class}` },
            ].map(({ Icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, background: 'var(--brand-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color="var(--brand)" />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-danger btn-full btn-lg" onClick={logout}>
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  )
}
