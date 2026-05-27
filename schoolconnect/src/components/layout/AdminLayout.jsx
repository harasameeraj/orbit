import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import { LayoutDashboard, Users, Megaphone, Settings, CalendarDays, Clock, IndianRupee } from 'lucide-react'

const LINKS = [
  { to: '/admin',          label: 'Dashboard',        Icon: LayoutDashboard },
  { to: '/admin/users',    label: 'User Management',  Icon: Users },
  { to: '/admin/fees',     label: 'Fee Management',   Icon: IndianRupee },
  { to: '/admin/noticeboard', label: 'Noticeboard',   Icon: Megaphone },
  { to: '/admin/timetable',label: 'Timetable',        Icon: Clock },
  { to: '/admin/calendar', label: 'Academic Calendar',Icon: CalendarDays },
  { to: '/admin/settings', label: 'Settings',         Icon: Settings },
]

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar links={LINKS} role="admin" />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  )
}
