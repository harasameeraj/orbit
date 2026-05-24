import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { Send, Clock, MessageCircle, Loader2, User } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'

export default function TeacherChat() {
  const { user, profile } = useAuth()
  const { students, messages, loadMessages, sendMessage } = useData()
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [parentProfile, setParentProfile] = useState(null)
  const [thread, setThread] = useState(null)
  const [loadingParent, setLoadingParent] = useState(false)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  const chatHourStart = 8
  const chatHourEnd = 17
  const currentHour = new Date().getHours()
  const withinChatHours = currentHour >= chatHourStart && currentHour < chatHourEnd

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Select the first student by default once loaded
  useEffect(() => {
    if (students && students.length > 0 && !selectedStudent) {
      setSelectedStudent(students[0])
    }
  }, [students])

  // Load chat and parent details when selected student changes
  useEffect(() => {
    if (!selectedStudent || !user) return
    initChatForStudent(selectedStudent)
  }, [selectedStudent, user])

  async function initChatForStudent(student) {
    setLoadingParent(true)
    setParentProfile(null)
    setThread(null)
    try {
      // Find parent linked to this student
      const { data: link, error: linkErr } = await supabase
        .from('parent_students')
        .select('parent_id, profiles(id, name, avatar_url)')
        .eq('student_id', student.id)
        .maybeSingle()

      if (linkErr) throw linkErr

      if (link?.profiles) {
        setParentProfile(link.profiles)
        const th = await loadMessages(link.parent_id, user.id, student.id)
        setThread(th)
      } else {
        console.warn('No parent linked to this student.')
      }
    } catch (e) {
      console.error('Teacher Chat init error:', e)
    }
    setLoadingParent(false)
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

  const parentName = parentProfile?.name || 'Parent'
  const parentInitial = parentName.charAt(0)
  const teacherInitial = profile?.name?.charAt(0) || 'T'

  return (
    <div className="animate-fade-in" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Messages" subtitle="Parent–Teacher Communication" />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '24px 32px', gap: 24, maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        
        {/* Student list sidebar */}
        <div className="card" style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 15 }}>
            Students / Parents
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {students.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <MessageCircle size={28} />
                <p style={{ fontSize: 13 }}>No students in your class</p>
              </div>
            ) : (
              students.map(s => {
                const isSelected = selectedStudent?.id === s.id
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    style={{
                      padding: '14px 16px',
                      background: isSelected ? 'var(--brand-light)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--brand)' : '3px solid transparent',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      transition: 'background .15s'
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div className="avatar avatar-sm" style={{ background: 'var(--brand)', color: 'white', fontWeight: 800 }}>
                        {s.name?.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Roll No: {s.roll_no || s.rollNo}</div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedStudent ? (
            <>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar" style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)', fontWeight: 800 }}>
                  {parentInitial}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{parentName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Parent of {selectedStudent.name}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chat hours: 8 AM – 5 PM</span>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: withinChatHours ? 'var(--accent-green)' : 'var(--accent-red)', display: 'inline-block' }} />
                </div>
              </div>

              {/* Student Context Bar */}
              <div style={{ padding: '10px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <User size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Student Profile: <strong>{selectedStudent.name}</strong> (Roll: {selectedStudent.roll_no || selectedStudent.rollNo})
                </span>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {loadingParent ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
                  </div>
                ) : !parentProfile ? (
                  <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <MessageCircle size={36} color="var(--text-muted)" />
                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>No Parent Linked</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>This student is not linked to any parent account yet.</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <MessageCircle size={36} color="var(--text-muted)" />
                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>No messages yet</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Start the conversation with {parentName}</p>
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
                          <div className="avatar avatar-sm" style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)', fontWeight: 800, flexShrink: 0 }}>
                            {parentInitial}
                          </div>
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
                          <div className="avatar avatar-sm" style={{ background: 'var(--brand-light)', color: 'var(--brand)', fontWeight: 800, flexShrink: 0 }}>
                            {teacherInitial}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input Area */}
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
                    style={{ padding: '10px 18px' }}
                  >
                    {sending ? (
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <MessageCircle size={40} color="var(--text-muted)" />
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>Select a Student</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Choose a student from the sidebar to chat with their parent.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
