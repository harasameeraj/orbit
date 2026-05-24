import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { Plus, Eye, EyeOff, Trash2, ImageIcon, X, Loader2, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'

const CATEGORIES = ['ACADEMICS', 'ADMINISTRATIVE', 'EVENTS', 'SPORTS', 'GENERAL']
const ALBUM_COLORS = ['#1a3a6b', '#0891b2', '#16a34a', '#7c3aed']

export default function AdminNoticeboard() {
  const { user, profile } = useAuth()
  const { notices, eventPhotos, addNotice, toggleNotice, reloadData } = useData()

  const [tab, setTab] = useState('notices')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'ACADEMICS', body: '' })
  const [noticeLoading, setNoticeLoading] = useState(false)
  const [noticeMsg, setNoticeMsg] = useState({ type: '', text: '' })
  const [filter, setFilter] = useState('All')

  // Photo album state
  const [showAlbumForm, setShowAlbumForm] = useState(false)
  const [albumTitle, setAlbumTitle] = useState('')
  const [albumFiles, setAlbumFiles] = useState([])
  const [albumUploading, setAlbumUploading] = useState(false)
  const [albumMsg, setAlbumMsg] = useState({ type: '', text: '' })
  const fileInputRef = useRef(null)

  // Delete notice
  const handleDelete = async (id) => {
    try {
      await supabase.from('notices').delete().eq('id', id)
      reloadData()
    } catch (err) {
      console.error('Failed to delete notice:', err)
    }
  }

  const handlePost = async () => {
    if (!form.title.trim()) {
      setNoticeMsg({ type: 'error', text: 'Title is required.' })
      return
    }
    setNoticeLoading(true)
    setNoticeMsg({ type: '', text: '' })
    try {
      await addNotice({ ...form })
      setForm({ title: '', category: 'ACADEMICS', body: '' })
      setNoticeMsg({ type: 'success', text: '✓ Notice posted and visible to all parents!' })
      setTimeout(() => { setShowAdd(false); setNoticeMsg({ type: '', text: '' }) }, 2000)
    } catch (e) {
      setNoticeMsg({ type: 'error', text: 'Failed: ' + e.message })
    }
    setNoticeLoading(false)
  }

  const handleAlbumUpload = async () => {
    if (!albumTitle.trim() || albumFiles.length === 0) {
      setAlbumMsg({ type: 'error', text: 'Add a title and at least one photo.' })
      return
    }
    setAlbumUploading(true)
    setAlbumMsg({ type: '', text: '' })
    try {
      const schoolId = profile?.school_id

      // 1. Create album row
      const { data: album, error: albumErr } = await supabase
        .from('event_albums')
        .insert({ school_id: schoolId, admin_id: user.id, title: albumTitle, is_featured: false })
        .select()
        .single()
      if (albumErr) throw albumErr

      // 2. Upload each photo to Supabase Storage
      const photoInserts = []
      for (const file of albumFiles) {
        const ext = file.name.split('.').pop()
        const path = `${schoolId}/${album.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('event-photos')
          .upload(path, file)
        if (upErr) throw upErr

        const { data: { publicUrl } } = supabase.storage.from('event-photos').getPublicUrl(path)
        photoInserts.push({ album_id: album.id, school_id: schoolId, url: publicUrl })
      }

      // 3. Insert photo rows
      await supabase.from('event_photos').insert(photoInserts)

      setAlbumMsg({ type: 'success', text: `✓ Album "${albumTitle}" created with ${albumFiles.length} photo(s)!` })
      setAlbumTitle('')
      setAlbumFiles([])
      setTimeout(() => { setShowAlbumForm(false); setAlbumMsg({ type: '', text: '' }) }, 2000)
    } catch (e) {
      setAlbumMsg({ type: 'error', text: 'Upload failed: ' + e.message })
    }
    setAlbumUploading(false)
  }

  const filteredNotices = notices.filter(n => {
    const isVisible = n.is_visible ?? n.visible
    if (filter === 'Visible') return isVisible
    if (filter === 'Hidden') return !isVisible
    return true
  })

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Noticeboard Management"
        subtitle="Communicate updates and showcase school events to the community."
        action={
          <button className="btn btn-primary btn-sm" onClick={() => { setShowAdd(true); setNoticeMsg({ type: '', text: '' }) }}>
            <Plus size={15} /> Create New Notice
          </button>
        }
      />
      <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>

        <div className="tabs" style={{ maxWidth: 300, marginBottom: 28 }}>
          <button className={`tab ${tab === 'notices' ? 'active' : ''}`} onClick={() => setTab('notices')}>Active Notices</button>
          <button className={`tab ${tab === 'photos' ? 'active' : ''}`} onClick={() => setTab('photos')}>Event Photos</button>
        </div>

        {/* ── PHOTOS TAB ── */}
        {tab === 'photos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImageIcon size={18} /> Event Photo Galleries
              </h2>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAlbumForm(true)}>
                <Plus size={14} /> Upload New Album
              </button>
            </div>

            {eventPhotos.length === 0 ? (
              <div className="empty-state card" style={{ padding: 60 }}>
                <ImageIcon size={36} />
                <p style={{ fontWeight: 600 }}>No photo albums yet</p>
                <p style={{ fontSize: 13 }}>Upload your first event album to share with parents</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {eventPhotos.map((album, i) => (
                  <div key={album.id} style={{
                    borderRadius: 16, overflow: 'hidden', cursor: 'pointer', position: 'relative', minHeight: 160,
                    background: album.cover_url ? `url(${album.cover_url}) center/cover` : ALBUM_COLORS[i % ALBUM_COLORS.length],
                    boxShadow: 'var(--shadow-md)', transition: 'transform .15s'
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,.1) 60%)' }} />
                    {album.is_featured && (
                      <div style={{ position: 'absolute', top: 12, left: 12, background: 'var(--brand)', color: 'white', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>FEATURED</div>
                    )}
                    <div style={{ position: 'absolute', bottom: 16, left: 16, color: 'white' }}>
                      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{album.title}</div>
                      <div style={{ fontSize: 12, opacity: .85 }}>
                        {album.event_photos?.[0]?.count || album.photos || 0} Photos •{' '}
                        {new Date(album.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Album upload modal */}
            {showAlbumForm && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowAlbumForm(false)}>
                <div className="card-lg" style={{ padding: 32, width: 480, background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800 }}>Upload Event Album</h2>
                    <button onClick={() => setShowAlbumForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                  </div>
                  {albumMsg.text && (
                    <div style={{ background: albumMsg.type === 'success' ? 'var(--accent-green-light)' : 'var(--accent-red-light)', color: albumMsg.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', padding: '10px 14px', borderRadius: 8, fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
                      {albumMsg.text}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Album Title *</label>
                      <input className="form-input" placeholder="e.g. Annual Sports Day 2024" value={albumTitle} onChange={e => setAlbumTitle(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Photos *</label>
                      <label style={{ display: 'block', border: '2px dashed var(--border)', borderRadius: 10, padding: '24px', textAlign: 'center', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                          onChange={e => setAlbumFiles(Array.from(e.target.files || []))} />
                        <Upload size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px', display: 'block' }} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {albumFiles.length > 0 ? `${albumFiles.length} photo(s) selected` : 'Click to select photos'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>PNG, JPG, WebP — multiple allowed</div>
                      </label>
                      {albumFiles.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                          {albumFiles.slice(0, 4).map((f, i) => (
                            <div key={i} style={{ width: 60, height: 60, background: 'var(--brand-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--brand)', fontWeight: 600, overflow: 'hidden' }}>
                              <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                          {albumFiles.length > 4 && (
                            <div style={{ width: 60, height: 60, background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>
                              +{albumFiles.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-primary btn-full btn-lg" onClick={handleAlbumUpload} disabled={albumUploading}>
                        {albumUploading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
                        {albumUploading ? 'Uploading...' : 'Upload Album'}
                      </button>
                      <button className="btn btn-ghost btn-lg" onClick={() => setShowAlbumForm(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── NOTICES TAB ── */}
        {tab === 'notices' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['All', 'Visible', 'Hidden'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: filter === f ? 'var(--brand)' : 'var(--surface-2)',
                  color: filter === f ? 'white' : 'var(--text-secondary)',
                  fontFamily: 'var(--font)', transition: 'all .15s'
                }}>{f}</button>
              ))}
            </div>

            {filteredNotices.length === 0 ? (
              <div className="empty-state card" style={{ padding: 60 }}>
                <p style={{ fontWeight: 600 }}>No notices found</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filteredNotices.map(notice => {
                  const isVisible = notice.is_visible ?? notice.visible
                  return (
                    <div key={notice.id} className="card" style={{ padding: 20, borderLeft: `4px solid ${isVisible ? 'var(--accent-green)' : 'var(--border-strong)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                            <span className="badge badge-brand" style={{ fontSize: 10 }}>{notice.category}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              Posted {notice.created_at ? new Date(notice.created_at).toLocaleDateString('en-IN') : notice.date}
                            </span>
                            {notice.attachment_url && (
                              <a href={notice.attachment_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>📎 Attachment</a>
                            )}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{notice.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {(notice.body || '').slice(0, 140)}{notice.body?.length > 140 ? '...' : ''}
                          </div>
                          <div style={{ fontSize: 12, marginTop: 8, color: isVisible ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {isVisible ? <><Eye size={13} /> Visible to Parents</> : <><EyeOff size={13} /> Hidden from Parents</>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                          <label className="toggle">
                            <input type="checkbox" checked={isVisible} onChange={() => toggleNotice(notice.id)} />
                            <span className="toggle-slider" />
                          </label>
                          <button onClick={() => handleDelete(notice.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ADD NOTICE MODAL ── */}
        {showAdd && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowAdd(false)}>
            <div className="card-lg" style={{ padding: 32, width: 520, background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Create New Notice</h2>
                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              {noticeMsg.text && (
                <div style={{ background: noticeMsg.type === 'success' ? 'var(--accent-green-light)' : 'var(--accent-red-light)', color: noticeMsg.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', padding: '10px 14px', borderRadius: 8, fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
                  {noticeMsg.text}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" placeholder="Notice title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea className="form-input form-textarea" rows={4} placeholder="Notice content..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary btn-full btn-lg" onClick={handlePost} disabled={noticeLoading}>
                    {noticeLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                    {noticeLoading ? 'Posting...' : 'Post Notice'}
                  </button>
                  <button className="btn btn-ghost btn-lg" onClick={() => setShowAdd(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
