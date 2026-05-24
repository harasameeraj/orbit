import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import { LayoutDashboard, CheckSquare, BarChart2, MessageCircle, User } from 'lucide-react'

const LINKS = [
  { to: '/parent', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/parent/attendance', label: 'Attendance', Icon: CheckSquare },
  { to: '/parent/marks', label: 'Marks & Grades', Icon: BarChart2 },
  { to: '/parent/chat', label: 'Messages', Icon: MessageCircle },
  { to: '/parent/profile', label: 'Profile', Icon: User },
]

export default function ParentLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar links={LINKS} role="parent" />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  )
}
