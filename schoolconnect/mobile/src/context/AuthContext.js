import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getProfile } from '../lib/supabase';

export const SCHOOL_STORAGE_KEY = 'sc_selected_school';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null);
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [storedSchool, setStoredSchool] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000);

    const init = async () => {
      try {
        // Load stored school from AsyncStorage
        const schoolStr = await AsyncStorage.getItem(SCHOOL_STORAGE_KEY);
        if (schoolStr) {
          setStoredSchool(JSON.parse(schoolStr));
        }

        // Restore Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const prof = await getProfile(session.user.id);
          setUser(session.user);
          setProfile(prof);
        }
      } catch (e) {
        // silent
      }
      clearTimeout(timeout);
      setLoading(false);
    };

    init();

    // Keep synchronous — async callbacks break signInWithPassword in supabase-js v2
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
    <AuthContext.Provider value={{
      user, profile, login, logout, loading, error,
      storedSchool, setStoredSchool,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
