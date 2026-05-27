import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, getProfile } from '../lib/supabase.js'
import { requestNotificationPermission, onForegroundMessage, showInAppNotification } from '../lib/firebase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000)

    // Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const prof = await getProfile(session.user.id)
          setUser(session.user)
          setProfile(prof)
          setupFcm(session.user.id)
        } catch (e) {
          console.error('Profile load error:', e)
        }
      }
      clearTimeout(timeout)
      setLoading(false)
    }).catch(err => {
      console.error('Session restore failed:', err)
      clearTimeout(timeout)
      setLoading(false)
    })

    // Keep this handler synchronous — async callbacks block the auth lock in
    // supabase-js 2.x and cause signInWithPassword to hang. login() handles
    // SIGNED_IN by fetching the profile itself.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
      }
    })

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  function setupFcm(userId) {
    requestNotificationPermission(userId).catch(console.warn)
    onForegroundMessage((msg) => {
      showInAppNotification(msg.title, msg.body)
    })
  }

  const login = async (email, password) => {
    setLoading(true)
    setError('')
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) throw authErr
      const prof = await getProfile(data.user.id)
      setUser(data.user)
      setProfile(prof)
      setupFcm(data.user.id)
      setLoading(false)
      return data.user
    } catch (e) {
      setError(e.message || 'Invalid email or password')
      setLoading(false)
      return null
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
