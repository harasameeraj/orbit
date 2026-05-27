import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Colors, Shadows, Radius } from '../../theme/colors';

export default function LoginScreen() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    await login(email.trim(), password);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Gradient-like header */}
      <View style={styles.header}>
        <View style={styles.headerOverlay} />
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Ionicons name="school" size={32} color={Colors.brand} />
          </View>
          <Text style={styles.appName}>SchoolConnect</Text>
          <Text style={styles.tagline}>Parent & Teacher Portal</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.formWrap} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSub}>Sign in with your school credentials</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.accentRed} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="teacher@school.edu.in"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
              {loading ? (
                <Text style={styles.btnText}>Signing in...</Text>
              ) : (
                <>
                  <Text style={styles.btnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </>
              )}
            </TouchableOpacity>

            {/* Demo credentials hint */}
            <View style={styles.demoWrap}>
              <Text style={styles.demoTitle}>Demo Credentials</Text>
              {[
                { role: 'Teacher', email: 'teacher@stxaviers.edu.in', pass: 'Teacher@1234' },
                { role: 'Parent', email: 'parent@stxaviers.edu.in', pass: 'Parent@1234' },
              ].map(d => (
                <TouchableOpacity key={d.role} style={styles.demoRow} onPress={() => { setEmail(d.email); setPassword(d.pass); }}>
                  <View style={[styles.demoBadge, d.role === 'Teacher' ? { backgroundColor: Colors.brandLight } : { backgroundColor: Colors.accentGreenLight }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: d.role === 'Teacher' ? Colors.brand : Colors.accentGreen }}>{d.role}</Text>
                  </View>
                  <Text style={styles.demoEmail}>{d.email}</Text>
                  <Ionicons name="arrow-forward-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
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
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.brandMid, opacity: 0.3,
  },
  logoWrap: { alignItems: 'center', zIndex: 1 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    ...Shadows.md,
  },
  appName: { fontSize: 26, fontWeight: '900', color: Colors.white, marginBottom: 4 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  formWrap: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius['2xl'],
    padding: 28,
    ...Shadows.lg,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  cardSub: { fontSize: 14, color: Colors.textMuted, marginBottom: 24 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.accentRedLight, padding: 14, borderRadius: Radius.lg, marginBottom: 16,
  },
  errorText: { fontSize: 13, color: Colors.accentRed, fontWeight: '600', flex: 1 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface2, borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },
  btn: {
    backgroundColor: Colors.brand, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  demoWrap: {
    marginTop: 24, padding: 16, backgroundColor: Colors.surface2,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  demoTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  demoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  demoEmail: { flex: 1, fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
});
