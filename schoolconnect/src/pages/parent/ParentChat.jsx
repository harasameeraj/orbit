import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { Send, Clock, MessageCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'

export default function ParentChat() {
  const { user, profile } = useAuth()
  const { students, activeStudent, messages, loadMessages, sendMessage } = useData()
  const [text, setText] = useState('')
  const [thread, setThread] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const subscriptionRef = useRef(null)

  const chatHourStart = 8
  const chatHourEnd = 17
  const currentHour = new Date().getHours()
  const withinChatHours = currentHour >= chatHourStart && currentHour < chatHourEnd

  // Get the active student (respects child switcher)
  const student = activeStudent || students[0]

  useEffect(() => {
    if (!user || !student || !profile) return
    initChat()
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [user, student, profile])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function initChat() {
    setLoading(true)
    try {
      // Find the class teacher from teacher_classes
      // For now we get teacher_id from behaviour_logs or use a fallback
      // In production, teacher_id comes from teacher_classes where is_class_teacher=true
      const { data: tc } = await supabase.from('teacher_classes')
        .select('teacher_id, profiles(id, name)')
        .eq('class_id', student.class_id)
        .eq('is_class_teacher', true)
        .single()

      const teacherId = tc?.teacher_id
      if (!teacherId) {
        setLoading(false)
        return
      }

      const th = await loadMessages(user.id, teacherId, student.id)
      setThread({ ...th, teacher: tc?.profiles })
    } catch (e) {
      console.error('Chat init error:', e)
    }
    setLoading(false)
  }

  const handleSend = async () => {
    if (!text.trim() || !thread || sending) return
    setSending(true)
    try {
      await sendMessage(thread.id, text)
      setText('')
    } catch (e) {
      console.error('Send error:', e)
    }
    setSending(false)
  }

  const teacherName = thread?.teacher?.name || 'Class Teacher'
  const teacherInitial = teacherName.charAt(0)
  const parentInitial = profile?.name?.charAt(0) || 'P'

  return (
    <div className="animate-fade-in" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Messages" subtitle="Parent–Teacher Chat" />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '24px 32px', gap: 24, maxWidth: 1000, margin: '0 auto', width: '100%' }}>

        {/* Thread list sidebar */}
        <div className="card" style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 15 }}>Conversations</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
              </div>
            ) : thread ? (
              <div style={{ padding: '14px 16px', background: 'var(--brand-light)', borderLeft: '3px solid var(--brand)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="avatar" style={{ background: 'var(--brand)', color: 'white', fontWeight: 800, flexShrink: 0 }}>{teacherInitial}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{teacherName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Class Teacher</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {messages.length > 0 ? 'Today' : 'No messages yet'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 24 }}>
                <MessageCircle size={28} />
                <p style={{ fontSize: 13 }}>No conversations yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="avatar" style={{ background: 'var(--brand)', color: 'white', fontWeight: 800 }}>{teacherInitial}</div>
            <div>
              <div style={{ fontWeight: 700 }}>{teacherName}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Class Teacher</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color="var(--text-muted)" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chat hours: 8 AM – 5 PM</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: withinChatHours ? 'var(--accent-green)' : 'var(--accent-red)', display: 'inline-block' }} />
            </div>
          </div>

          {/* Student context bar */}
          {student && (
            <div style={{ padding: '10px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <MessageCircle size={14} color="var(--text-muted)" />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Regarding: <strong>{student.name}</strong> — Class {student.classes?.name || student.class}</span>
            </div>
          )}

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                <MessageCircle size={36} />
                <p style={{ fontWeight: 600 }}>No messages yet</p>
                <p style={{ fontSize: 13 }}>Start the conversation with the class teacher</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.sender_id === user.id
                const time = msg.sent_at
                  ? new Date(msg.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                  : ''
                return (
                  <div key={msg.id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 10, alignItems: 'flex-end' }}>
                    {!isMe && (
                      <div className="avatar avatar-sm" style={{ background: 'var(--brand)', color: 'white', fontWeight: 800, flexShrink: 0 }}>{teacherInitial}</div>
                    )}
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isMe ? 'var(--brand)' : 'var(--surface-2)',
                        color: isMe ? 'white' : 'var(--text-primary)',
                        fontSize: 14, lineHeight: 1.5,
                        border: isMe ? 'none' : '1px solid var(--border)'
                      }}>
                        {msg.text}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                        {time}
                      </div>
                    </div>
                    {isMe && (
                      <div className="avatar avatar-sm" style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)', fontWeight: 800, flexShrink: 0 }}>{parentInitial}</div>
                    )}
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            {!withinChatHours && (
              <div style={{ background: 'var(--accent-amber-light)', color: 'var(--accent-amber)', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} /> Outside chat hours. Messages can be sent 8 AM – 5 PM on school days.
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="form-input"
                placeholder="Type a message..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                style={{ flex: 1 }}
                disabled={!withinChatHours || !thread}
              />
              <button
                className="btn btn-primary"
                onClick={handleSend}
                disabled={!text.trim() || !withinChatHours || !thread || sending}
                style={{ padding: '10px 18px' }}>
                {sending
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
