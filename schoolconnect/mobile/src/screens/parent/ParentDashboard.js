import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import ChildSwitcher from '../../components/shared/ChildSwitcher';
import { Colors, Radius } from '../../theme/colors';

export default function ParentDashboard({ navigation }) {
  const { homework, announcements, behaviourLogs, attendance, marks, students, activeStudent, reloadData, loadingData } = useData();
  const { user } = useAuth();

  const student = activeStudent || students[0] || {};
  const studentId = student.id;
  const firstName = student.name?.split(' ')[0] || user?.email?.split('@')[0] || 'your child';

  const today = new Date().toISOString().split('T')[0];
  const todayAttRecords = studentId ? (attendance[studentId] || []) : [];
  const todayAtt = todayAttRecords.find(r => r.date === today);
  const attStatus = todayAtt?.status;

  const allMarks = studentId ? (marks[studentId] || []) : [];
  const latestExam = allMarks.flatMap(s => s.exams || []).slice(-1)[0];
  const latestHw = homework[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const attColor = attStatus === 'present' ? Colors.accentGreen
    : attStatus === 'absent' ? Colors.accentRed
    : attStatus === 'late' ? Colors.accentAmber
    : Colors.textMuted;
  const attBg = attStatus === 'present' ? Colors.accentGreenLight
    : attStatus === 'absent' ? Colors.accentRedLight
    : attStatus === 'late' ? Colors.accentAmberLight
    : Colors.surface2;
  const attIcon = attStatus === 'absent' ? 'close-circle' : attStatus === 'late' ? 'time' : 'checkmark-circle';

  return (
    <View style={styles.container}>
      <ChildSwitcher />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loadingData} onRefresh={reloadData} tintColor={Colors.brand} />}
      >
      {/* Greeting */}
      <View style={{ marginBottom: 20 }}>
        <Text style={styles.greeting}>{greeting}!</Text>
        <Text style={styles.subtitle}>Here is a quick look at {firstName}'s day so far.</Text>
      </View>

      {/* Daily Report */}
      <Card variant="lg" style={[styles.reportCard, { borderLeftWidth: 4, borderLeftColor: Colors.brand }]}>
        <View style={styles.reportHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="star" size={18} color={Colors.brand} />
            <Text style={{ fontWeight: '700', fontSize: 16, color: Colors.text }}>Daily Report Summary</Text>
          </View>
          <Badge variant="green">Today</Badge>
        </View>

        {/* Attendance */}
        <View style={[styles.reportRow, { backgroundColor: attBg }]}>
          <View style={[styles.reportIcon, { backgroundColor: attBg, borderColor: attColor + '30' }]}>
            <Ionicons name={attIcon} size={18} color={attColor} />
          </View>
          <View>
            <Text style={styles.reportLabel}>ATTENDANCE</Text>
            <Text style={[styles.reportValue, { color: attColor }]}>{attStatus ? attStatus.charAt(0).toUpperCase() + attStatus.slice(1) : 'Not Marked'}</Text>
            {todayAtt?.marked_at && (
              <Text style={styles.reportMeta}>Marked at {new Date(todayAtt.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
            )}
          </View>
        </View>

        {/* Latest Score */}
        <View style={[styles.reportRow, { backgroundColor: Colors.surface2 }]}>
          <View style={[styles.reportIcon, { backgroundColor: Colors.brandLight }]}>
            <Ionicons name="star" size={18} color={Colors.brand} />
          </View>
          <View>
            <Text style={styles.reportLabel}>LATEST SCORE</Text>
            {latestExam ? (
              <>
                <Text style={[styles.reportValue, { color: Colors.text }]}>{latestExam.score}/{latestExam.max}</Text>
                <Text style={styles.reportMeta}>{latestExam.name}</Text>
              </>
            ) : (
              <Text style={{ fontSize: 14, color: Colors.textMuted }}>No marks published yet</Text>
            )}
          </View>
        </View>

        {/* Homework */}
        {latestHw && (
          <View style={[styles.reportRow, { backgroundColor: Colors.accentAmberLight, borderWidth: 1, borderColor: Colors.accentAmber, borderStyle: 'dashed' }]}>
            <Ionicons name="book" size={18} color={Colors.accentAmber} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: Colors.text }}>Upcoming Homework</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text }}>"{latestHw.title}"</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="calendar" size={12} color={Colors.accentAmber} />
                <Text style={{ fontSize: 12, color: Colors.accentAmber, fontWeight: '600' }}>Due {latestHw.due_date || latestHw.dueDate}</Text>
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* Quick Access */}
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
        {[
          { label: 'View Attendance Record', icon: 'checkmark-circle-outline', screen: 'Attendance' },
          { label: 'View Marks & Progress', icon: 'star-outline', screen: 'Marks' },
          { label: 'Message Teacher', icon: 'chatbubble-outline', screen: 'Chat' },
          { label: 'Fees & Payment', icon: 'card-outline', screen: 'Fees' },
        ].map(({ label, icon, screen }, i) => (
          <TouchableOpacity key={label} style={[styles.quickLink, i < 3 && { borderBottomWidth: 1, borderBottomColor: Colors.border }]} onPress={() => navigation.navigate(screen)}>
            <Ionicons name={icon} size={18} color={Colors.textMuted} />
            <Text style={styles.quickText}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </Card>

      {/* Announcement */}
      {announcements[0] && (
        <View style={styles.announcement}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Ionicons name="megaphone" size={14} color="rgba(255,255,255,0.75)" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)' }}>ANNOUNCEMENT</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.white, marginBottom: 4 }}>{announcements[0].title}</Text>
          {announcements[0].body && (
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{announcements[0].body}</Text>
          )}
        </View>
      )}

      {/* Behaviour Log */}
      {behaviourLogs[0] && (
        <Card variant="lg" style={{ padding: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <View style={[styles.reportIcon, { backgroundColor: Colors.brandLight }]}>
              <Text style={{ fontWeight: '800', color: Colors.brand, fontSize: 14 }}>{behaviourLogs[0].teacher_name?.charAt(0) || 'T'}</Text>
            </View>
            <View>
              <Text style={{ fontWeight: '700', color: Colors.text }}>{behaviourLogs[0].teacher_name || 'Class Teacher'}</Text>
              <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                {behaviourLogs[0].created_at ? new Date(behaviourLogs[0].created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 22, fontStyle: 'italic', marginBottom: 16 }}>
            "{behaviourLogs[0].note}"
          </Text>
          <TouchableOpacity style={styles.msgBtn} onPress={() => navigation.navigate('Chat')}>
            <Ionicons name="chatbubble" size={15} color={Colors.white} />
            <Text style={{ color: Colors.white, fontWeight: '700', fontSize: 14 }}>Message Teacher</Text>
          </TouchableOpacity>
        </Card>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 28, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  reportCard: { padding: 20, marginBottom: 20 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: Radius.lg, marginBottom: 10 },
  reportIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  reportLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5 },
  reportValue: { fontWeight: '800', fontSize: 18, marginTop: 2 },
  reportMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: 12 },
  quickLink: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  quickText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  announcement: { backgroundColor: Colors.brand, borderRadius: Radius['2xl'], padding: 20, marginBottom: 20 },
  msgBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.brand, paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.lg, alignSelf: 'flex-start' },
});
