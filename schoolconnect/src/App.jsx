import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { DataProvider } from './context/DataContext.jsx'
import NotificationToast from './components/shared/NotificationToast.jsx'
import ErrorBoundary from './components/shared/ErrorBoundary.jsx'

import SchoolCodePage from './pages/auth/SchoolCodePage.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import SetPasswordPage from './pages/auth/SetPasswordPage.jsx'

import TeacherLayout from './components/layout/TeacherLayout.jsx'
import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx'
import TeacherAttendance from './pages/teacher/TeacherAttendance.jsx'
import TeacherMarks from './pages/teacher/TeacherMarks.jsx'
import TeacherStudents from './pages/teacher/TeacherStudents.jsx'
import TeacherProfile from './pages/teacher/TeacherProfile.jsx'
import TeacherChat from './pages/teacher/TeacherChat.jsx'

import ParentLayout from './components/layout/ParentLayout.jsx'
import ParentDashboard from './pages/parent/ParentDashboard.jsx'
import ParentAttendance from './pages/parent/ParentAttendance.jsx'
import ParentMarks from './pages/parent/ParentMarks.jsx'
import ParentProfile from './pages/parent/ParentProfile.jsx'
import ParentChat from './pages/parent/ParentChat.jsx'
import ParentFees from './pages/parent/ParentFees.jsx'

import AdminLayout from './components/layout/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
import AdminNoticeboard from './pages/admin/AdminNoticeboard.jsx'
import AdminSettings from './pages/admin/AdminSettings.jsx'
import AdminTimetable from './pages/admin/AdminTimetable.jsx'
import AdminCalendar from './pages/admin/AdminCalendar.jsx'
import AdminFees from './pages/admin/AdminFees.jsx'

// FIX: Uses profile.role (not user.role). Also waits for loading
// so session restore after page refresh doesn't flash-redirect to /login.
function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12, color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 14 }}>Loading...</span>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) return <Navigate to="/login" replace />
  return children
}

function RoleRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  if (profile?.role === 'teacher') return <Navigate to="/teacher" replace />
  return <Navigate to="/parent" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <NotificationToast />
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<SchoolCodePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />

            <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherLayout /></ProtectedRoute>}>
              <Route index element={<TeacherDashboard />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="marks" element={<TeacherMarks />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="profile" element={<TeacherProfile />} />
              <Route path="chat" element={<TeacherChat />} />
            </Route>

            <Route path="/parent" element={<ProtectedRoute role="parent"><ParentLayout /></ProtectedRoute>}>
              <Route index element={<ParentDashboard />} />
              <Route path="attendance" element={<ParentAttendance />} />
              <Route path="marks" element={<ParentMarks />} />
              <Route path="profile" element={<ParentProfile />} />
              <Route path="chat" element={<ParentChat />} />
              <Route path="fees" element={<ParentFees />} />
            </Route>

            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="noticeboard" element={<AdminNoticeboard />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="timetable" element={<AdminTimetable />} />
              <Route path="calendar" element={<AdminCalendar />} />
              <Route path="fees" element={<AdminFees />} />
            </Route>
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  )
}
