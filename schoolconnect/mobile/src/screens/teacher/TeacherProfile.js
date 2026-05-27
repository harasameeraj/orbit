import React from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Colors, Radius, Shadows } from '../../theme/colors';

export default function TeacherProfile() {
  const { user, profile, logout } = useAuth();
  const { students, reloadData, loadingData } = useData();

  const teacherName = profile?.name || user?.email || 'Teacher';
  const schoolName = profile?.schools?.name || '—';
  const primaryClass = profile?.teacher_classes?.find(tc => tc.is_class_teacher) || profile?.teacher_classes?.[0];
  const className = primaryClass?.classes?.name || '—';
  const subject = primaryClass?.subject || profile?.subject_specialty || '—';
  const isClassTeacher = primaryClass?.is_class_teacher || false;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loadingData} onRefresh={reloadData} tintColor={Colors.brand} />}
    >
      {/* Profile Header Card */}
      <Card variant="lg" style={styles.profileCard}>
        <Avatar name={teacherName} size={80} style={{ backgroundColor: Colors.brand }} />
        <Text style={styles.name}>{teacherName}</Text>
        <View style={styles.badgeRow}>
          <Badge variant="brand">{subject} Teacher</Badge>
          {isClassTeacher && <Badge variant="green">Class Teacher</Badge>}
        </View>
        <Text style={styles.schoolName}>{schoolName}</Text>
      </Card>

      {/* Details List */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        <View style={{ gap: 14 }}>
          {[
            { label: 'Email', value: user?.email || '—', icon: 'mail-outline' },
            { label: 'Subject Specialty', value: subject, icon: 'book-outline' },
            { label: 'Assigned Class', value: className, icon: 'people-outline' },
            { label: 'School', value: schoolName, icon: 'business-outline' },
            { label: 'Total Students', value: students.length > 0 ? `${students.length} students` : 'No students loaded', icon: 'school-outline' },
          ].map(({ label, value, icon }) => (
            <View key={label} style={styles.detailRow}>
              <View style={styles.iconBg}>
                <Ionicons name={icon} size={16} color={Colors.brand} />
              </View>
              <View>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Multiple Classes if any */}
      {profile?.teacher_classes?.length > 1 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>All Assigned Classes</Text>
          <View style={{ gap: 8 }}>
            {profile.teacher_classes.map((tc, idx) => (
              <View key={idx} style={styles.classItem}>
                <View>
                  <Text style={styles.classItemName}>{tc.classes?.name || 'Class'}</Text>
                  <Text style={styles.classItemSub}>{tc.subject || 'General'}</Text>
                </View>
                {tc.is_class_teacher && <Badge variant="green">Class Teacher</Badge>}
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Sign Out Button */}
      <Button
        variant="danger"
        style={styles.logoutBtn}
        onPress={() => {
          Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
          ]);
        }}
      >
        Sign Out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  profileCard: { padding: 24, alignItems: 'center', gap: 10 },
  name: { fontSize: 20, fontWeight: '800', color: Colors.text },
  badgeRow: { flexDirection: 'row', gap: 8 },
  schoolName: { fontSize: 13, color: Colors.textMuted },
  card: { padding: 16 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBg: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase' },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: 2 },
  classItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    padding: 10,
    borderRadius: Radius.md,
  },
  classItemName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  classItemSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  logoutBtn: { paddingVertical: 12 },
});
