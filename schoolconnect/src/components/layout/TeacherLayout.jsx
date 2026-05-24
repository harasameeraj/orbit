import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import { LayoutDashboard, CheckSquare, Star, Users, User } from 'lucide-react'

const LINKS = [
  { to: '/teacher', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/teacher/attendance', label: 'Attendance', Icon: CheckSquare },
  { to: '/teacher/marks', label: 'Marks', Icon: Star },
  { to: '/teacher/students', label: 'Students', Icon: Users },
  { to: '/teacher/profile', label: 'Profile', Icon: User },
]

export default function TeacherLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar links={LINKS} role="teacher" />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  )
}
