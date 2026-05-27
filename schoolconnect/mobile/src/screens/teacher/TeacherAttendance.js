import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import { getAttendanceByDate } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors, Radius } from '../../theme/colors';

export default function TeacherAttendance() {
  const { students, markAttendance, classId, reloadData, loadingData } = useData();
  const today = new Date().toISOString().split('T')[0];
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadTodayAttendance = async () => {
    if (!students || students.length === 0) return;
    setLoading(true);
    try {
      const records = classId ? await getAttendanceByDate(classId, today) : [];
      const nextStatuses = {};

      // Default all to present
      students.forEach(s => {
        nextStatuses[s.id] = 'present';
      });

      // Overlay database records
      if (records && records.length > 0) {
        records.forEach(r => {
          if (nextStatuses[r.student_id]) {
            nextStatuses[r.student_id] = r.status;
          }
        });
      }
      setStatuses(nextStatuses);
    } catch (err) {
      console.error('Failed to load today\'s attendance:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTodayAttendance();
  }, [students, classId]);

  const handleRefresh = async () => {
    await reloadData();
    await loadTodayAttendance();
  };

  const toggle = (id, status) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
  };

  const markAll = () => {
    const nextStatuses = { ...statuses };
    students.forEach(s => {
      nextStatuses[s.id] = 'present';
    });
    setStatuses(nextStatuses);
  };

  const handleSubmit = async () => {
    const records = students.map(s => ({ studentId: s.id, status: statuses[s.id] }));
    setSubmitting(true);
    try {
      await markAttendance(records, today);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (e) {
      console.error('Attendance submit failed:', e);
    }
    setSubmitting(false);
  };

  const presentCount = Object.values(statuses).filter(s => s === 'present').length;
  const absentCount = Object.values(statuses).filter(s => s === 'absent').length;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loadingData || loading} onRefresh={handleRefresh} tintColor={Colors.brand} />}
      >
        <Text style={styles.dateLabel}>{todayLabel}</Text>

        {submitted && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.accentGreen} />
            <Text style={styles.successText}>Attendance submitted successfully!</Text>
          </View>
        )}

        {/* Stats and Mark All */}
        <Card style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: Colors.accentGreen }]}>{presentCount}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: Colors.accentRed }]}>{absentCount}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statNum}>{students.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.markAllBtn} onPress={markAll}>
            <Ionicons name="checkmark-done" size={16} color={Colors.brand} />
            <Text style={styles.markAllText}>Mark All Present</Text>
          </TouchableOpacity>
        </Card>

        {/* Student list */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.brand} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ gap: 10 }}>
            {students.map((student, index) => {
              const status = statuses[student.id] || 'present';
              const activeColor = status === 'present' ? Colors.accentGreen : Colors.accentRed;

              return (
                <Card
                  key={student.id}
                  style={[styles.studentCard, { borderLeftWidth: 4, borderLeftColor: activeColor }]}
                >
                  <View style={styles.rollBadge}>
                    <Text style={styles.rollText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentRoll}>Roll No: {student.roll_no || student.rollNo}</Text>
                  </View>

                  {/* Toggle controls */}
                  <View style={styles.controls}>
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        status === 'present' ? styles.toggleBtnPresent : styles.toggleBtnInactive,
                      ]}
                      onPress={() => toggle(student.id, 'present')}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={status === 'present' ? Colors.accentGreen : Colors.textMuted}
                      />
                      <Text style={[styles.toggleText, status === 'present' && styles.toggleTextPresent]}>P</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        status === 'absent' ? styles.toggleBtnAbsent : styles.toggleBtnInactive,
                      ]}
                      onPress={() => toggle(student.id, 'absent')}
                    >
                      <Ionicons
                        name="close-circle"
                        size={14}
                        color={status === 'absent' ? Colors.accentRed : Colors.textMuted}
                      />
                      <Text style={[styles.toggleText, status === 'absent' && styles.toggleTextAbsent]}>A</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {!loading && students.length > 0 && (
          <Button
            variant="primary"
            style={styles.submitBtn}
            onPress={handleSubmit}
            loading={submitting}
          >
            Submit Attendance
          </Button>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },
  dateLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4 },
  successBanner: {
    backgroundColor: Colors.accentGreenLight,
    padding: 12,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successText: { color: Colors.accentGreen, fontWeight: '700', fontSize: 13 },
  statsCard: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statsGrid: { flexDirection: 'row', gap: 18 },
  statCol: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, marginTop: 2 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: Colors.brandLight, borderRadius: Radius.sm },
  markAllText: { color: Colors.brand, fontWeight: '700', fontSize: 11 },
  studentCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rollBadge: { width: 28, height: 28, borderRadius: 6, backgroundColor: Colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  rollText: { fontWeight: '700', color: Colors.brand, fontSize: 12 },
  studentName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  studentRoll: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  controls: { flexDirection: 'row', gap: 6 },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  toggleBtnInactive: { borderColor: Colors.border, backgroundColor: 'transparent' },
  toggleBtnPresent: { borderColor: Colors.accentGreen, backgroundColor: Colors.accentGreenLight },
  toggleBtnAbsent: { borderColor: Colors.accentRed, backgroundColor: Colors.accentRedLight },
  toggleText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  toggleTextPresent: { color: Colors.accentGreen },
  toggleTextAbsent: { color: Colors.accentRed },
  submitBtn: { marginTop: 10, paddingVertical: 12 },
});
