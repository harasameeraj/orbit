import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getSchoolByCode } from '../../lib/supabase';
import { useAuth, SCHOOL_STORAGE_KEY } from '../../context/AuthContext';
import { Colors, Shadows, Radius } from '../../theme/colors';

export default function SchoolCodeScreen({ navigation }) {
  const { setStoredSchool } = useAuth();
  const [code, setCode]       = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setChecking(true);
    setError('');
    try {
      const school = await getSchoolByCode(trimmed);
      if (!school) {
        setError('School code not found. Please check with your school admin.');
        setChecking(false);
        return;
      }
      await AsyncStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(school));
      setStoredSchool(school);
      navigation.replace('Login');
    } catch (e) {
      console.warn('SchoolCodeScreen lookup error:', e?.message);
      setError('Network error — please check your connection and try again.');
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Ionicons name="school" size={32} color={Colors.brand} />
        </View>
        <Text style={styles.appName}>SchoolConnect</Text>
        <Text style={styles.tagline}>Enter your school code to continue</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Find Your School</Text>
            <Text style={styles.cardSub}>
              Your school code was provided by your school administrator
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>School Code</Text>
              <TextInput
                style={styles.codeInput}
                placeholder="e.g. STXAV"
                placeholderTextColor={Colors.textMuted}
                value={code}
                onChangeText={t => { setCode(t.toUpperCase()); setError(''); }}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={10}
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={15} color={Colors.accentRed} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.btn, (!code.trim() || checking) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={!code.trim() || checking}
              activeOpacity={0.85}
            >
              {checking ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    backgroundColor: Colors.brand,
    paddingTop: 64,
    paddingBottom: 36,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  logoCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, ...Shadows.md,
  },
  appName:  { fontSize: 26, fontWeight: '900', color: Colors.white, marginBottom: 4 },
  tagline:  { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius['2xl'],
    padding: 28,
    marginBottom: 16,
    ...Shadows.lg,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  cardSub: { fontSize: 13, color: Colors.textMuted, marginBottom: 24, lineHeight: 19 },

  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  codeInput: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    borderWidth: 1.5, borderColor: Colors.border,
    fontSize: 24, fontWeight: '900', letterSpacing: 8,
    textAlign: 'center', color: Colors.text,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accentRedLight,
    padding: 10, borderRadius: Radius.md, marginTop: 10,
  },
  errorText: { fontSize: 13, color: Colors.accentRed, fontWeight: '600', flex: 1 },

  btn: {
    backgroundColor: Colors.brand, borderRadius: Radius.lg,
    paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },

});
