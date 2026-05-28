import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  // Reusable: fetch and set profile for a given user id
  const refreshProfile = useCallback(async (userId) => {
    try {
      const prof = await getProfile(userId);
      setProfile(prof);
      return prof;
    } catch (e) {
      console.warn('AuthContext: failed to fetch profile:', e?.message);
      return null;
    }
  }, []);

  useEffect(() => {
    // Safety timeout: if init takes longer than 8s, stop loading
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
          setUser(session.user);
          await refreshProfile(session.user.id);
        }
      } catch (e) {
        console.warn('AuthContext init error:', e?.message);
      }
      clearTimeout(timeout);
      setLoading(false);
    };

    init();

    // Listen for auth state changes
    // Keep synchronous callback — async callbacks break signInWithPassword in supabase-js v2
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Re-fetch profile when session is refreshed or user signs back in
        setUser(session.user);
        refreshProfile(session.user.id);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Update user object on token refresh (may carry updated metadata)
        setUser(session.user);
      }
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, [refreshProfile]);

  const login = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
      const prof = await getProfile(data.user.id);
      setUser(data.user);
      setProfile(prof);
      return data.user;
    } catch (e) {
      const msg = e?.message || 'Invalid email or password';
      setError(msg);
      console.warn('AuthContext login error:', msg);
      return null;
    } finally {
      // Guarantee loading resets even on unexpected errors
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('AuthContext logout error:', e?.message);
    }
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, login, logout, loading, error,
      storedSchool, setStoredSchool, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
