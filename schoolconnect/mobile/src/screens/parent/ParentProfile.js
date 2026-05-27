import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { supabase, getTeachersByClass } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ChildSwitcher from '../../components/shared/ChildSwitcher';
import { Colors, Radius } from '../../theme/colors';

const TEACHER_COLORS = ['#ffa94d', '#69db7c', '#74c0fc', '#da77f2', '#ff6b6b', '#a9e34b'];

export default function ParentProfile() {
  const { user, logout, profile } = useAuth();
  const { students, activeStudent, reloadData, loadingData } = useData();
  const student = activeStudent || students[0] || {};

  const [photoUrl, setPhotoUrl] = useState(student.photo_url || null);
  const [uploading, setUploading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);

  useEffect(() => {
    if (student.photo_url) {
      setPhotoUrl(student.photo_url);
    } else {
      setPhotoUrl(null);
    }
  }, [student.photo_url]);

  useEffect(() => {
    const classId = student.class_id;
    if (!classId) return;
    setTeachersLoading(true);
    getTeachersByClass(classId)
      .then(t => setTeachers(t))
      .catch(() => setTeachers([]))
      .finally(() => setTeachersLoading(false));
  }, [student.class_id]);

  const displayName = student.name || user?.email?.split('@')[0] || 'Student';

  const handleSimulatePhotoChange = async () => {
    if (!student.id) return;
    setUploading(true);
    try {
      // Simulate photo selection by picking a random cool avatar seed
      const randomSeed = Math.floor(Math.random() * 1000000);
      const simulatedUrl = `https://api.dicebear.com/7.x/avataaars/png?seed=${randomSeed}`;

      // Update in Supabase
      const { error } = await supabase
        .from('students')
        .update({ photo_url: simulatedUrl })
        .eq('id', student.id);

      if (error) throw error;

      setPhotoUrl(simulatedUrl);
      Alert.alert('Success', 'Profile photo updated successfully!');
      reloadData();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ChildSwitcher />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loadingData} onRefresh={reloadData} tintColor={Colors.brand} />}
      >
      {/* Profile Card */}
      <Card variant="lg" style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Avatar name={displayName} url={photoUrl} size={96} />
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={handleSimulatePhotoChange}
            disabled={uploading || !student.id}
          >
            {uploading ? (
              <LoadingSpinner size="small" color={Colors.white} fullScreen={false} />
            ) : (
              <Ionicons name="camera" size={14} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.profileName}>{displayName}</Text>

        <View style={styles.badgesRow}>
          {student.roll_no && <Badge variant="brand">Roll No: {student.roll_no}</Badge>}
          {(student.class_name || student.classes?.name) && (
            <Badge variant="green">Class: {student.class_name || student.classes?.name}</Badge>
          )}
        </View>

        <Text style={styles.cameraHelpText}>Tap camera icon to simulate photo update</Text>
      </Card>

      {/* Assigned Teachers */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Assigned Teachers</Text>
        {teachersLoading ? (
          <LoadingSpinner size="small" fullScreen={false} />
        ) : teachers.length === 0 ? (
          <Text style={styles.emptyText}>No teachers assigned yet</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {teachers.map((t, i) => {
              const color = TEACHER_COLORS[i % TEACHER_COLORS.length];
              const initials = (t.name || 'T').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <View key={t.id || i} style={styles.teacherItem}>
                  <View style={[styles.teacherAvatar, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.teacherInitials, { color }]}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teacherName}>{t.name}</Text>
                    <Text style={styles.teacherRole}>{t.subject_specialty || 'Class Teacher'}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* Personal Details */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Personal Details</Text>
        <View style={{ gap: 16 }}>
          {[
            { label: 'Date of Birth', value: student.dob || '—', icon: 'calendar-outline' },
            { label: "Father's Name", value: student.father_name || '—', icon: 'person-outline' },
            { label: 'Contact Email', value: user?.email || '—', icon: 'mail-outline' },
            { label: 'Phone', value: student.contact_phone || profile?.phone || '—', icon: 'call-outline' },
          ].map(({ label, value, icon }, idx) => (
            <View key={idx} style={styles.detailRow}>
              <Ionicons name={icon} size={18} color={Colors.textMuted} style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Logout */}
      <Button
        variant="danger"
        style={styles.logoutBtn}
        onPress={() => {
          Alert.alert('Logout', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
          ]);
        }}
      >
        Logout from Portal
      </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  profileCard: { padding: 24, alignItems: 'center' },
  avatarContainer: { position: 'relative', marginBottom: 14 },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.brand,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  badgesRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 8 },
  cameraHelpText: { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
  card: { padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  emptyText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingVertical: 10 },
  teacherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface2,
    padding: 10,
    borderRadius: Radius.md,
  },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherInitials: { fontWeight: '800', fontSize: 13 },
  teacherName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  teacherRole: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  detailRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  detailIcon: { width: 20 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: 2 },
  logoutBtn: { paddingVertical: 12 },
});
