import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { Send, Clock, MessageCircle, Loader2, User } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'

export default function TeacherChat() {
  const { user, profile } = useAuth()
  const { students, messages, loadMessages, sendMessage } = useData()
  const [threads, setThreads] = useState([])        // all existing threads for this teacher
  const [selectedThread, setSelectedThread] = useState(null)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const [loadingThreads, setLoadingThreads] = useState(true)
  const bottomRef = useRef(null)

  const chatHourStart = 8
  const chatHourEnd = 17
  const currentHour = new Date().getHours()
  const withinChatHours = currentHour >= chatHourStart && currentHour < chatHourEnd

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load all threads for this teacher on mount
  useEffect(() => {
    if (!user) return
    loadTeacherThreads()
  }, [user])

  async function loadTeacherThreads() {
    setLoadingThreads(true)
    try {
      const { data, error } = await supabase
        .from('message_threads')
        .select(`
          id, parent_id, student_id,
          parent:profiles!message_threads_parent_id_fkey(id, name),
          student:students(id, name, roll_no)
        `)
        .eq('teacher_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setThreads(data || [])

      // Auto-select first thread
      if (data && data.length > 0) {
        selectThread(data[0])
      }
    } catch (e) {
      console.error('loadTeacherThreads error:', e)
    }
    setLoadingThreads(false)
  }

  async function selectThread(thread) {
    setSelectedThread(thread)
    await loadMessages(thread.parent_id, user.id, thread.student_id)
  }

  // Also allow initiating a new chat from a student who doesn't have a thread yet
  async function initiateFromStudent(student) {
    // Check if thread already exists
    const existing = threads.find(t => t.student_id === student.id)
    if (existing) { selectThread(existing); return }

    // Find parent linked to this student
    const { data: link } = await supabase
      .from('parent_students')
      .select('parent_id, profiles(id, name)')
      .eq('student_id', student.id)
      .maybeSingle()

    if (!link?.profiles) {
      alert(`No parent account linked to ${student.name} yet.`)
      return
    }

    const thread = await loadMessages(link.parent_id, user.id, student.id)
    const newThread = {
      id: thread.id,
      parent_id: link.parent_id,
      student_id: student.id,
      parent: link.profiles,
      student: { id: student.id, name: student.name, roll_no: student.roll_no },
    }
    setThreads(prev => [newThread, ...prev.filter(t => t.id !== thread.id)])
    setSelectedThread(newThread)
  }

  const handleSend = async () => {
    if (!text.trim() || !selectedThread || sending) return
    setSending(true)
    try {
      await sendMessage(selectedThread.id, text)
      setText('')
    } catch (e) {
      console.error('Send error:', e)
    }
    setSending(false)
  }

  // Students with no thread yet (can initiate)
  const studentsWithoutThread = students.filter(s => !threads.some(t => t.student_id === s.id))

  const parentName = selectedThread?.parent?.name || 'Parent'
  const studentName = selectedThread?.student?.name || ''
  const parentInitial = parentName.charAt(0)
  const teacherInitial = profile?.name?.charAt(0) || 'T'

  return (
    <div className="animate-fade-in" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Messages" subtitle="Parent–Teacher Communication" />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '24px 32px', gap: 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>

        {/* Left panel — conversations */}
        <div className="card" style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 15 }}>
            Conversations
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingThreads ? (
              <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
              </div>
            ) : (
              <>
                {/* Existing threads */}
                {threads.map(t => {
                  const isSelected = selectedThread?.id === t.id
                  return (
                    <div key={t.id} onClick={() => selectThread(t)}
                      style={{ padding: '14px 16px', background: isSelected ? 'var(--brand-light)' : 'transparent', borderLeft: isSelected ? '3px solid var(--brand)' : '3px solid transparent', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background .15s' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div className="avatar avatar-sm" style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)', fontWeight: 800, flexShrink: 0 }}>
                          {(t.parent?.name || 'P').charAt(0)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.parent?.name || 'Parent'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>re: {t.student?.name || 'Student'}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Students who can be initiated */}
                {studentsWithoutThread.length > 0 && (
                  <>
                    <div style={{ padding: '10px 16px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5, borderTop: threads.length ? '1px solid var(--border)' : 'none' }}>
                      Start New Chat
                    </div>
                    {studentsWithoutThread.map(s => (
                      <div key={s.id} onClick={() => initiateFromStudent(s)}
                        style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div className="avatar avatar-sm" style={{ background: 'var(--brand-light)', color: 'var(--brand)', fontWeight: 800, flexShrink: 0 }}>
                            {s.name?.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Roll: {s.roll_no || '—'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {threads.length === 0 && studentsWithoutThread.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center' }}>
                    <MessageCircle size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No students in your class</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedThread ? (
            <>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar" style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)', fontWeight: 800 }}>
                  {parentInitial}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{parentName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Parent of {studentName}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chat hours: 8 AM – 5 PM</span>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: withinChatHours ? 'var(--accent-green)' : 'var(--accent-red)', display: 'inline-block' }} />
                </div>
              </div>

              {/* Student context bar */}
              <div style={{ padding: '10px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <User size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Student: <strong>{studentName}</strong>{selectedThread.student?.roll_no ? ` (Roll: ${selectedThread.student.roll_no})` : ''}
                </span>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {messages.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <MessageCircle size={36} style={{ marginBottom: 8 }} />
                    <p style={{ fontWeight: 600 }}>No messages yet</p>
                    <p style={{ fontSize: 13 }}>Start the conversation with {parentName}</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.sender_id === user.id
                    const time = msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''
                    return (
                      <div key={msg.id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 10, alignItems: 'flex-end' }}>
                        {!isMe && (
                          <div className="avatar avatar-sm" style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)', fontWeight: 800, flexShrink: 0 }}>{parentInitial}</div>
                        )}
                        <div style={{ maxWidth: '70%' }}>
                          <div style={{ padding: '12px 16px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? 'var(--brand)' : 'var(--surface-2)', color: isMe ? 'white' : 'var(--text-primary)', fontSize: 14, lineHeight: 1.5, border: isMe ? 'none' : '1px solid var(--border)' }}>
                            {msg.text}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>{time}</div>
                        </div>
                        {isMe && (
                          <div className="avatar avatar-sm" style={{ background: 'var(--brand-light)', color: 'var(--brand)', fontWeight: 800, flexShrink: 0 }}>{teacherInitial}</div>
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
                  <div style={{ background: '#fef3c7', color: '#92400e', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} /> Outside chat hours. Messages can be sent 8 AM – 5 PM.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="form-input" placeholder="Type a message..." value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    style={{ flex: 1 }} disabled={!withinChatHours} />
                  <button className="btn btn-primary" onClick={handleSend}
                    disabled={!text.trim() || !withinChatHours || sending}
                    style={{ padding: '10px 18px' }}>
                    {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
              <MessageCircle size={40} style={{ marginBottom: 8 }} />
              <p style={{ fontWeight: 600 }}>No conversations yet</p>
              <p style={{ fontSize: 13 }}>Select a student from the left to start chatting with their parent</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
