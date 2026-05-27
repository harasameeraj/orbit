import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { LogOut, Mail, BookOpen, Users, School, GraduationCap } from 'lucide-react'

export default function TeacherProfile() {
  const { user, profile, logout } = useAuth()
  const { students } = useData()

  const teacherName = profile?.name || user?.email || 'Teacher'
  const teacherInitial = teacherName.charAt(0).toUpperCase()
  const schoolName = profile?.schools?.name || '—'
  const primaryClass = profile?.teacher_classes?.find(tc => tc.is_class_teacher) || profile?.teacher_classes?.[0]
  const className = primaryClass?.classes?.name || '—'
  const subject = primaryClass?.subject || profile?.subject_specialty || '—'
  const isClassTeacher = primaryClass?.is_class_teacher || false

  return (
    <div className="animate-fade-in">
      <PageHeader title="Profile" />
      <div style={{ padding: '28px 32px', maxWidth: 600, margin: '0 auto' }}>

        {/* Profile Card */}
        <div className="card-lg" style={{ padding: 32, textAlign: 'center', marginBottom: 24 }}>
          <div className="avatar avatar-xl" style={{ background: 'var(--brand-light)', color: 'var(--brand)', fontWeight: 800, margin: '0 auto 16px', fontSize: 32 }}>
            {teacherInitial}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{teacherName}</h2>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span className="badge badge-brand">{subject} Teacher</span>
            {isClassTeacher && <span className="badge badge-green">Class Teacher</span>}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 10 }}>{schoolName}</div>
        </div>

        {/* Details */}
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { Icon: Mail, label: 'Email', value: user?.email || '—' },
              { Icon: BookOpen, label: 'Subject', value: subject },
              { Icon: Users, label: 'Assigned Class', value: className },
              { Icon: School, label: 'School', value: schoolName },
              { Icon: GraduationCap, label: 'Total Students', value: students.length > 0 ? `${students.length} students` : 'No students loaded' },
            ].map(({ Icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, background: 'var(--brand-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

        {/* All assigned classes if multiple */}
        {profile?.teacher_classes?.length > 1 && (
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>All Assigned Classes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profile.teacher_classes.map((tc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{tc.classes?.name || 'Class'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tc.subject || 'General'}</div>
                  </div>
                  {tc.is_class_teacher && <span className="badge badge-green" style={{ fontSize: 11 }}>Class Teacher</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-full btn-lg" style={{ background: 'var(--accent-red)', color: 'white', border: 'none' }} onClick={logout}>
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  )
}
