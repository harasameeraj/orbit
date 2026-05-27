import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'

export default function NotificationToast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = (e) => {
      const { title, body } = e.detail
      const id = Date.now()
      setToasts(prev => [...prev, { id, title, body }])
      // Auto-dismiss after 5 seconds
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
    }
    window.addEventListener('sc:notification', handler)
    return () => window.removeEventListener('sc:notification', handler)
  }, [])

  if (!toasts.length) return null

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(toast => (
        <div key={toast.id} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderLeft: '4px solid var(--brand)', borderRadius: 12,
          padding: '14px 16px', width: 320, boxShadow: 'var(--shadow-lg)',
          display: 'flex', gap: 12, animation: 'fadeIn .2s ease'
        }}>
          <div style={{ width: 36, height: 36, background: 'var(--brand-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={16} color="var(--brand)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{toast.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{toast.body}</div>
          </div>
          <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
