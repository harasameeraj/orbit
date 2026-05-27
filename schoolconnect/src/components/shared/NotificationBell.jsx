import { useState, useEffect, useRef } from 'react'
import { Bell, MessageSquare, Megaphone, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'

export default function NotificationBell() {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!user || !profile) return
    fetchNotifications()
  }, [user, profile])

  async function fetchNotifications() {
    setLoading(true)
    const items = []

    try {
      // --- Announcements / Notices (from admin to everyone, or teacher to class) ---
      if (profile.role === 'parent') {
        // Get student's class_id from parent_students
        const { data: links } = await supabase
          .from('parent_students')
          .select('students(class_id)')
          .eq('parent_id', user.id)
        const classIds = (links || []).map(l => l.students?.class_id).filter(Boolean)

        // Announcements for their class
        if (classIds.length > 0) {
          const { data: anns } = await supabase
            .from('announcements')
            .select('id, title, body, created_at')
            .in('class_id', classIds)
            .order('created_at', { ascending: false })
            .limit(5)
          ;(anns || []).forEach(a => items.push({
            id: `ann-${a.id}`, type: 'announcement',
            title: a.title, body: a.body,
            time: a.created_at, from: 'Teacher',
          }))
        }

        // Notices (from admin)
        const { data: notices } = await supabase
          .from('notices')
          .select('id, title, body, created_at')
          .eq('school_id', profile.school_id)
          .eq('is_visible', true)
          .order('created_at', { ascending: false })
          .limit(5)
        ;(notices || []).forEach(n => items.push({
          id: `notice-${n.id}`, type: 'notice',
          title: n.title, body: n.body,
          time: n.created_at, from: 'Admin',
        }))

        // Messages received (from teacher)
        const { data: threads } = await supabase
          .from('message_threads')
          .select('id')
          .eq('parent_id', user.id)
        if (threads?.length) {
          const threadIds = threads.map(t => t.id)
          const { data: msgs } = await supabase
            .from('messages')
            .select('id, text, sent_at, profiles(name)')
            .in('thread_id', threadIds)
            .neq('sender_id', user.id)
            .order('sent_at', { ascending: false })
            .limit(5)
          ;(msgs || []).forEach(m => items.push({
            id: `msg-${m.id}`, type: 'message',
            title: `Message from ${m.profiles?.name || 'Teacher'}`,
            body: m.text, time: m.sent_at, from: 'Teacher',
          }))
        }
      }

      if (profile.role === 'teacher') {
        const teacherClasses = profile.teacher_classes || []
        const classIds = teacherClasses.map(tc => tc.class_id).filter(Boolean)

        // Notices from admin
        const { data: notices } = await supabase
          .from('notices')
          .select('id, title, body, created_at')
          .eq('school_id', profile.school_id)
          .eq('is_visible', true)
          .order('created_at', { ascending: false })
          .limit(5)
        ;(notices || []).forEach(n => items.push({
          id: `notice-${n.id}`, type: 'notice',
          title: n.title, body: n.body,
          time: n.created_at, from: 'Admin',
        }))

        // Messages received (from parents)
        const { data: threads } = await supabase
          .from('message_threads')
          .select('id')
          .eq('teacher_id', user.id)
        if (threads?.length) {
          const threadIds = threads.map(t => t.id)
          const { data: msgs } = await supabase
            .from('messages')
            .select('id, text, sent_at, profiles(name)')
            .in('thread_id', threadIds)
            .neq('sender_id', user.id)
            .order('sent_at', { ascending: false })
            .limit(5)
          ;(msgs || []).forEach(m => items.push({
            id: `msg-${m.id}`, type: 'message',
            title: `Message from ${m.profiles?.name || 'Parent'}`,
            body: m.text, time: m.sent_at, from: 'Parent',
          }))
        }
      }

      // Sort by time descending, take top 10
      items.sort((a, b) => new Date(b.time) - new Date(a.time))
      const top = items.slice(0, 10)
      setNotifications(top)

      // Unread = messages received in last 48 hours
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      setUnread(top.filter(n => n.type === 'message' && n.time > cutoff).length)
    } catch (e) {
      console.error('Notifications fetch error:', e)
    }
    setLoading(false)
  }

  const roleColor = profile?.role === 'teacher' ? 'var(--brand)' : '#16a34a'

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications() }}
        style={{ position: 'relative', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 5, right: 5, width: 16, height: 16, background: 'var(--accent-red)', borderRadius: '50%', border: '2px solid white', fontSize: 9, fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 44, right: 0, width: 340, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.12)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>Notifications</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={16} /></button>
          </div>

          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <Bell size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No notifications yet</p>
              </div>
            ) : notifications.map(n => (
              <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: n.type === 'message' ? roleColor + '20' : '#7c3aed20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {n.type === 'message'
                    ? <MessageSquare size={15} color={roleColor} />
                    : <Megaphone size={15} color="#7c3aed" />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>From {n.from} · {timeAgo(n.time)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
