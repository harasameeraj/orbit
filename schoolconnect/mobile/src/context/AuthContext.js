import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getProfile } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000);

    // Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const prof = await getProfile(session.user.id);
          setUser(session.user);
          setProfile(prof);
        } catch (e) {
          console.error('Profile load error:', e);
        }
      }
      clearTimeout(timeout);
      setLoading(false);
    }).catch(err => {
      console.error('Session restore failed:', err);
      clearTimeout(timeout);
      setLoading(false);
    });

    // Keep this handler synchronous — mirrors the web app pattern
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
      const prof = await getProfile(data.user.id);
      setUser(data.user);
      setProfile(prof);
      setLoading(false);
      return data.user;
    } catch (e) {
      setError(e.message || 'Invalid email or password');
      setLoading(false);
      return null;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
