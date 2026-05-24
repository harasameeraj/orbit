import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { Save, Upload, GraduationCap, Bell, Palette, Loader2 } from 'lucide-react'
import { supabase, updateSchoolSettings } from '../../lib/supabase.js'

const BRAND_COLORS = ['#1a3a6b', '#16a34a', '#dc2626', '#d97706', '#7c3aed']

export default function AdminSettings() {
  const { profile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState({ type: '', text: '' })
  const [logoUploading, setLogoUploading] = useState(false)

  const [settings, setSettings] = useState({
    name: '',
    address: '',
    academic_year: '2024-2025',
    session_start: '',
    brand_color: '#1a3a6b',
    absence_alerts_enabled: true,
    report_time: '16:00',
    logo_url: '',
  })

  // Load current school settings
  useEffect(() => {
    if (!profile?.school_id) return
    supabase.from('schools').select('*').eq('id', profile.school_id).single().then(({ data }) => {
      if (data) setSettings({
        name: data.name || '',
        address: data.address || '',
        academic_year: data.academic_year || '2024-2025',
        session_start: data.session_start || '',
        brand_color: data.brand_color || '#1a3a6b',
        absence_alerts_enabled: data.absence_alerts_enabled ?? true,
        report_time: data.report_time?.slice(0, 5) || '16:00',
        logo_url: data.logo_url || '',
      })
    })
  }, [profile?.school_id])

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }))

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.school_id) return
    setLogoUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.school_id}/logo.${ext}`
      const { error: upErr } = await supabase.storage
        .from('school-logos')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('school-logos').getPublicUrl(path)
      set('logo_url', publicUrl)
      setSaveMsg({ type: 'success', text: 'Logo uploaded successfully!' })
      setTimeout(() => setSaveMsg({ type: '', text: '' }), 3000)
    } catch (err) {
      setSaveMsg({ type: 'error', text: 'Logo upload failed: ' + err.message })
    }
    setLogoUploading(false)
  }

  const handleSave = async () => {
    if (!profile?.school_id) return
    setSaving(true)
    setSaveMsg({ type: '', text: '' })
    try {
      await updateSchoolSettings(profile.school_id, {
        name: settings.name,
        address: settings.address,
        academic_year: settings.academic_year,
        session_start: settings.session_start || null,
        brand_color: settings.brand_color,
        absence_alerts_enabled: settings.absence_alerts_enabled,
        report_time: settings.report_time + ':00',
        logo_url: settings.logo_url || null,
      })
      setSaveMsg({ type: 'success', text: 'Settings saved successfully!' })
      setTimeout(() => setSaveMsg({ type: '', text: '' }), 3000)
    } catch (err) {
      setSaveMsg({ type: 'error', text: 'Save failed: ' + err.message })
    }
    setSaving(false)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="School Settings" subtitle="Manage your institutional identity, academic cycles, and system-wide preferences." />
      <div style={{ padding: '28px 32px', maxWidth: 700, margin: '0 auto' }}>

        {saveMsg.text && (
          <div style={{ background: saveMsg.type === 'success' ? 'var(--accent-green-light)' : 'var(--accent-red-light)', color: saveMsg.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', padding: '14px 20px', borderRadius: 10, marginBottom: 24, fontWeight: 600, fontSize: 14 }}>
            {saveMsg.text}
          </div>
        )}

        {/* School Information */}
        <div className="card" style={{ padding: 28, marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={20} color="var(--brand)" /> School Information
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">School Name</label>
              <input className="form-input" value={settings.name} onChange={e => set('name', e.target.value)} />
            </div>

            {/* Logo upload */}
            <div className="form-group">
              <label className="form-label">School Logo</label>
              <label style={{ display: 'block', border: '2px dashed var(--border)', borderRadius: 10, padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleLogoUpload} />
                {logoUploading
                  ? <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block', color: 'var(--brand)' }} />
                  : <Upload size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px', display: 'block' }} />}
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {logoUploading ? 'Uploading...' : 'Click to upload logo'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>PNG, JPG up to 5MB</div>
              </label>
              {settings.logo_url && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={settings.logo_url} alt="School logo" style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--border)' }} />
                  <span style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>✓ Logo uploaded</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Official Address</label>
              <textarea className="form-input form-textarea" rows={3} value={settings.address} onChange={e => set('address', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Academic Year */}
        <div className="card" style={{ padding: 28, marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>📅 Academic Year Configuration</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Active Session</label>
              <select className="form-input form-select" value={settings.academic_year} onChange={e => set('academic_year', e.target.value)}>
                {['2024-2025', '2023-2024', '2025-2026'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={settings.session_start} onChange={e => set('session_start', e.target.value)} />
            </div>
          </div>
          <div style={{ background: 'var(--accent-blue-light)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--accent-blue)' }}>ℹ</span>
            <p style={{ fontSize: 13, color: 'var(--accent-blue)' }}>Changing the active session affects gradebook calculations and attendance reports globally.</p>
          </div>
        </div>

        {/* Branding */}
        <div className="card" style={{ padding: 28, marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Palette size={20} color="var(--brand)" /> Branding
          </h2>
          <div className="form-group">
            <label className="form-label">Primary Brand Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              {BRAND_COLORS.map(color => (
                <button key={color} onClick={() => set('brand_color', color)} style={{
                  width: 36, height: 36, borderRadius: 8, background: color, cursor: 'pointer',
                  border: settings.brand_color === color ? '3px solid var(--text-primary)' : '2px solid transparent',
                  outline: settings.brand_color === color ? '2px solid white' : 'none', outlineOffset: -4,
                  transition: 'all .15s'
                }} />
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: settings.brand_color, border: '1px solid var(--border)' }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: settings.brand_color }}>{settings.brand_color.toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card" style={{ padding: 28, marginBottom: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={20} color="var(--brand)" /> Notifications
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>Absence Alerts</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Notify parents automatically when a student is marked absent.</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={settings.absence_alerts_enabled} onChange={e => set('absence_alerts_enabled', e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="divider" />
            <div className="form-group">
              <label className="form-label">Daily Report Delivery Time</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input className="form-input" type="time" value={settings.report_time} onChange={e => set('report_time', e.target.value)} style={{ maxWidth: 160 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)', background: 'var(--brand-light)', padding: '8px 12px', borderRadius: 8 }}>IST</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Reports will be batched and sent via push notification at this time.</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary btn-full btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => window.location.reload()}>Discard</button>
        </div>
      </div>
    </div>
  )
}
