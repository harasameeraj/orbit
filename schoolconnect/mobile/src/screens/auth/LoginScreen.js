import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, SCHOOL_STORAGE_KEY } from '../../context/AuthContext';
import { Colors, Shadows, Radius } from '../../theme/colors';


export default function LoginScreen({ navigation }) {
  const { login, loading, error, storedSchool, setStoredSchool } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Safety net: if somehow there's no school stored, send back to SchoolCode
  useEffect(() => {
    if (!storedSchool) {
      navigation.replace('SchoolCode');
    }
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      // Show validation feedback instead of silently returning
      return;
    }
    await login(email.trim(), password);
  };

  const handleChangeSchool = async () => {
    await AsyncStorage.removeItem(SCHOOL_STORAGE_KEY);
    setStoredSchool(null);
    navigation.replace('SchoolCode');
  };

  const brandColor = storedSchool?.brand_color || Colors.brand;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Branded header */}
      <View style={[styles.header, { backgroundColor: brandColor }]}>
        <View style={styles.logoCircle}>
          <Ionicons name="school" size={32} color={brandColor} />
        </View>
        <Text style={styles.appName}>SchoolConnect</Text>
        <Text style={styles.tagline}>Parent & Teacher Portal</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.formWrap}
          keyboardShouldPersistTaps="handled"
        >
          {/* School banner */}
          {storedSchool && (
            <View style={styles.schoolBanner}>
              <View style={styles.schoolBannerLeft}>
                <View style={[styles.schoolDot, { backgroundColor: brandColor }]}>
                  <Ionicons name="school" size={14} color={Colors.white} />
                </View>
                <View>
                  <Text style={styles.schoolName}>{storedSchool.name}</Text>
                  <Text style={styles.schoolCode}>{storedSchool.code}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleChangeSchool} style={styles.changeBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={13} color={Colors.textMuted} />
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}

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
                  placeholder="you@school.edu.in"
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
                  <Ionicons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={20} color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: brandColor }, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <Text style={styles.btnText}>Signing in...</Text>
              ) : (
                <>
                  <Text style={styles.btnText}>Sign In</Text>
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
    paddingTop: 60, paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...Shadows.md,
  },
  appName:  { fontSize: 26, fontWeight: '900', color: Colors.white, marginBottom: 4 },
  tagline:  { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  formWrap: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

  schoolBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm,
  },
  schoolBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  schoolDot: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  schoolName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  schoolCode: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  changeBtn:  { flexDirection: 'row', alignItems: 'center', gap: 2 },
  changeBtnText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius['2xl'],
    padding: 28, ...Shadows.lg,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  cardSub:   { fontSize: 14, color: Colors.textMuted, marginBottom: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.accentRedLight, padding: 14,
    borderRadius: Radius.lg, marginBottom: 16,
  },
  errorText: { fontSize: 13, color: Colors.accentRed, fontWeight: '600', flex: 1 },

  inputGroup: { marginBottom: 18 },
  label: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface2, borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },

  btn: {
    borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
});
