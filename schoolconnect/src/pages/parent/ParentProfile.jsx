import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { uploadStudentPhoto, getTeachersByClass } from '../../lib/supabase.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { LogOut, Mail, Phone, Calendar, User, Camera, Loader } from 'lucide-react'

const TEACHER_COLORS = ['#ffa94d', '#69db7c', '#74c0fc', '#da77f2', '#ff6b6b', '#a9e34b']

export function ParentProfile() {
  const { user, logout, profile } = useAuth()
  const { students, reloadData } = useData()
  const student = students[0] || {}

  const [photoUrl, setPhotoUrl] = useState(student.photo_url || null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [teachersLoading, setTeachersLoading] = useState(false)
  const fileInputRef = useRef(null)

  // Sync photo from student data
  useEffect(() => {
    if (student.photo_url) setPhotoUrl(student.photo_url)
  }, [student.photo_url])

  // Load class teachers
  useEffect(() => {
    const classId = student.class_id
    if (!classId) return
    setTeachersLoading(true)
    getTeachersByClass(classId)
      .then(t => setTeachers(t))
      .catch(() => setTeachers([]))
      .finally(() => setTeachersLoading(false))
  }, [student.class_id])

  const displayName = student.name || user?.email?.split('@')[0] || 'Student'
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !student.id) return
    if (!file.type.startsWith('image/')) { setUploadError('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image must be under 5 MB.'); return }
    setUploading(true)
    setUploadError(null)
    try {
      const url = await uploadStudentPhoto(student.id, file)
      setPhotoUrl(url)
      reloadData()
    } catch (err) {
      console.error(err)
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Student Profile" />
      <div style={{ padding: '28px 32px', maxWidth: 600, margin: '0 auto' }}>

        {/* Profile card */}
        <div className="card-lg" style={{ padding: 32, textAlign: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={displayName}
                style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--brand-light)' }}
              />
            ) : (
              <div className="avatar avatar-xl" style={{ background: 'linear-gradient(135deg, var(--brand-light), var(--brand-mid))', color: 'var(--brand)', fontWeight: 900, fontSize: 36, border: '4px solid var(--brand-light)' }}>
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !student.id}
              title={student.id ? 'Change photo' : 'Student data loading…'}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28,
                background: (uploading || !student.id) ? 'var(--text-muted)' : 'var(--brand)',
                border: '2px solid white', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: (uploading || !student.id) ? 'not-allowed' : 'pointer',
                color: 'white', transition: 'background .2s',
              }}
            >
              {uploading
                ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                : <Camera size={12} />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>

          {uploadError && <p style={{ fontSize: 12, color: '#dc2626', margin: '-4px 0 8px' }}>{uploadError}</p>}
          {uploading && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '-4px 0 8px' }}>Uploading…</p>}

          <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 10 }}>{displayName}</h2>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {student.roll_no && <span className="badge badge-brand">Roll No: {student.roll_no}</span>}
            {(student.class_name || student.classes?.name) && (
              <span className="badge badge-green">Class: {student.class_name || student.classes?.name}</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>Tap the camera icon to update the student photo</p>
        </div>

        {/* Assigned Teachers */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Assigned Teachers</h3>
          {teachersLoading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
              <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : teachers.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
              No teachers assigned yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {teachers.map((t, i) => {
                const color = TEACHER_COLORS[i % TEACHER_COLORS.length]
                const initials = (t.name || 'T').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10 }}>
                    <div style={{ width: 40, height: 40, background: color + '30', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.subject_specialty || 'Class Teacher'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Personal Details */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Personal Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { Icon: Calendar, label: 'Date of Birth', value: student.dob || '—' },
              { Icon: User, label: "Father's Name", value: student.father_name || '—' },
              { Icon: Mail, label: 'Contact Email', value: user?.email || '—' },
              { Icon: Phone, label: 'Phone', value: student.contact_phone || profile?.phone || '—' },
            ].map(({ Icon, label, value }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-danger btn-full btn-lg" onClick={logout}>
          <LogOut size={18} /> Logout from Portal
        </button>
      </div>
    </div>
  )
}

export default ParentProfile
