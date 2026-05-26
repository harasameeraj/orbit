import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import { useData } from '../../context/DataContext.jsx'
import { LayoutDashboard, CheckSquare, BarChart2, MessageCircle, User, CreditCard, Loader2 } from 'lucide-react'

const LINKS = [
  { to: '/parent', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/parent/attendance', label: 'Attendance', Icon: CheckSquare },
  { to: '/parent/marks', label: 'Marks & Grades', Icon: BarChart2 },
  { to: '/parent/chat', label: 'Messages', Icon: MessageCircle },
  { to: '/parent/fees', label: 'Fees & Payment', Icon: CreditCard },
  { to: '/parent/profile', label: 'Profile', Icon: User },
]

export default function ParentLayout() {
  const { students, activeStudent, switchStudent, switchingChild } = useData()
  const multiChild = students.length > 1

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar links={LINKS} role="parent" />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

        {/* ── Child switcher — only shown when parent has 2+ kids ── */}
        {multiChild && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 28px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginRight: 4 }}>
              Viewing:
            </span>
            {students.map(s => {
              const isActive = s.id === activeStudent?.id
              return (
                <button
                  key={s.id}
                  onClick={() => switchStudent(s)}
                  disabled={switchingChild}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '5px 14px',
                    borderRadius: 99,
                    border: isActive ? '2px solid var(--brand)' : '2px solid var(--border)',
                    background: isActive ? 'var(--brand)' : 'transparent',
                    color: isActive ? 'white' : 'var(--text)',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: switchingChild ? 'not-allowed' : 'pointer',
                    transition: 'all .15s',
                    opacity: switchingChild && !isActive ? 0.5 : 1,
                  }}
                >
                  {/* Avatar initial */}
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: isActive ? 'rgba(255,255,255,.25)' : 'var(--brand-light)',
                    color: isActive ? 'white' : 'var(--brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800,
                  }}>
                    {(s.name || '?')[0].toUpperCase()}
                  </span>
                  {s.name?.split(' ')[0]}
                  {s.classes?.name && (
                    <span style={{ fontWeight: 400, opacity: 0.75, fontSize: 11 }}>
                      · {s.classes.name}
                    </span>
                  )}
                </button>
              )
            })}
            {switchingChild && (
              <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--text-muted)', marginLeft: 4 }} />
            )}
          </div>
        )}

        {/* Page content */}
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
