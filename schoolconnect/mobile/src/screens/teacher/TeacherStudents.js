import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { getBehaviourLogs } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors, Radius, Shadows } from '../../theme/colors';

const REMARK_TYPES = [
  { value: 'positive',   label: 'Positive',   color: Colors.accentGreen,  bg: Colors.accentGreenLight },
  { value: 'concern',    label: 'Concern',     color: Colors.accentAmber,  bg: Colors.accentAmberLight },
  { value: 'disciplinary', label: 'Disciplinary', color: Colors.accentRed, bg: Colors.accentRedLight },
  { value: 'academic',   label: 'Academic',    color: Colors.brand,         bg: Colors.brandLight },
];

export default function TeacherStudents() {
  const { students, addBehaviourLog, reloadData, loadingData } = useData();
  const { profile } = useAuth();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  // Modal form state
  const [remarkText, setRemarkText] = useState('');
  const [remarkType, setRemarkType] = useState('positive');
  const [remarkSaving, setRemarkSaving] = useState(false);
  const [studentLogs, setStudentLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Filter students
  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.name?.toLowerCase().includes(q) || s.roll_no?.toLowerCase().includes(q);
    const attendancePct = s.attendance_pct ?? 100;
    if (filter === 'low') return matchSearch && attendancePct < 80;
    if (filter === 'high') return matchSearch && attendancePct >= 90;
    return matchSearch;
  });

  // Load selected student behavior logs
  useEffect(() => {
    if (!selected) {
      setStudentLogs([]);
      return;
    }
    setLoadingLogs(true);
    const today = new Date().toISOString().split('T')[0];
    getBehaviourLogs(selected.id, today)
      .then(logs => setStudentLogs(logs || []))
      .catch(console.error)
      .finally(() => setLoadingLogs(false));
  }, [selected]);

  const handleRemark = async () => {
    if (!remarkText.trim() || !selected) return;
    setRemarkSaving(true);
    try {
      await addBehaviourLog({
        studentId: selected.id,
        note: remarkText.trim(),
        type: remarkType,
      });

      // Update local state list
      setStudentLogs(prev => [
        {
          note: remarkText.trim(),
          type: remarkType,
          teacher_name: profile?.name || 'Teacher',
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setRemarkText('');
      Alert.alert('Success', 'Remark saved successfully!');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save remark.');
    } finally {
      setRemarkSaving(false);
    }
  };

  const attVal = (s) => s.attendance_pct ?? s.attendance ?? null;
  const attColor = (pct) => {
    if (pct == null) return Colors.textMuted;
    if (pct >= 90) return Colors.accentGreen;
    if (pct >= 75) return Colors.accentAmber;
    return Colors.accentRed;
  };

  const getTypeInfo = (type) => REMARK_TYPES.find(t => t.value === type) || REMARK_TYPES[0];

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or roll number..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { value: 'all', label: 'All Students' },
            { value: 'high', label: 'High Attendance (≥90%)' },
            { value: 'low', label: 'Needs Attention (<80%)' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.pillBtn, filter === opt.value ? styles.pillBtnActive : styles.pillBtnInactive]}
              onPress={() => setFilter(opt.value)}
            >
              <Text style={[styles.pillText, filter === opt.value ? styles.pillTextActive : styles.pillTextInactive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Grid list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loadingData}
        onRefresh={reloadData}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={Colors.textMuted} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyTitle}>No students found</Text>
          </View>
        }
        renderItem={({ item: student }) => {
          const pct = attVal(student);
          const activeAttColor = attColor(pct);

          return (
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => setSelected(student)}
            >
              <View style={styles.cardHeader}>
                <Avatar name={student.name} url={student.photo_url} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentRoll}>Roll No: {student.roll_no}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>ATTENDANCE</Text>
                  <Text style={[styles.statValue, { color: activeAttColor }]}>
                    {pct != null ? `${pct}%` : '—'}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>AVG SCORE</Text>
                  <Text style={[styles.statValue, { color: Colors.brand }]}>
                    {student.avg_score != null ? `${student.avg_score}` : '—'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Details / Remark modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={selected?.name} url={selected?.photo_url} size={48} />
              <View>
                <Text style={styles.modalStudentName}>{selected?.name}</Text>
                <Text style={styles.modalStudentRoll}>Roll No: {selected?.roll_no}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {selected && (
            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Stats */}
              <View style={styles.modalStatsRow}>
                <View style={styles.modalStatBox}>
                  <Text style={styles.modalStatLabel}>Attendance</Text>
                  <Text style={[styles.modalStatValue, { color: attColor(attVal(selected)) }]}>
                    {attVal(selected) != null ? `${attVal(selected)}%` : '—'}
                  </Text>
                </View>
                <View style={styles.modalStatBox}>
                  <Text style={styles.modalStatLabel}>Avg Score</Text>
                  <Text style={[styles.modalStatValue, { color: Colors.brand }]}>
                    {selected.avg_score != null ? `${selected.avg_score}` : '—'}
                  </Text>
                </View>
              </View>

              {/* Parents Contact info */}
              <Text style={styles.sectionLabel}>Parent Contact</Text>
              <View style={styles.contactContainer}>
                {selected.father_name && (
                  <View style={styles.contactItem}>
                    <Ionicons name="call-outline" size={16} color={Colors.textSecondary} />
                    <View>
                      <Text style={styles.contactRole}>Father</Text>
                      <Text style={styles.contactName}>{selected.father_name}</Text>
                    </View>
                  </View>
                )}
                {selected.mother_name && (
                  <View style={styles.contactItem}>
                    <Ionicons name="call-outline" size={16} color={Colors.textSecondary} />
                    <View>
                      <Text style={styles.contactRole}>Mother</Text>
                      <Text style={styles.contactName}>{selected.mother_name}</Text>
                    </View>
                  </View>
                )}
                {!selected.father_name && !selected.mother_name && (
                  <Text style={styles.emptyText}>No parent contact on file</Text>
                )}
              </View>

              {/* Add remark */}
              <Text style={styles.sectionLabel}>Add Behaviour Remark</Text>
              <Card style={{ padding: 14, gap: 12 }}>
                {/* Remark Type Selector */}
                <View style={styles.remarkTypeRow}>
                  {REMARK_TYPES.map(t => {
                    const isActive = remarkType === t.value;
                    return (
                      <TouchableOpacity
                        key={t.value}
                        style={[
                          styles.remarkTypeBtn,
                          isActive ? { backgroundColor: t.bg, borderColor: t.color } : { backgroundColor: Colors.surface2, borderColor: 'transparent' },
                        ]}
                        onPress={() => setRemarkType(t.value)}
                      >
                        <Text style={[styles.remarkTypeText, { color: isActive ? t.color : Colors.textSecondary }]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={styles.remarkInput}
                  placeholder="Write a detailed behaviour note..."
                  placeholderTextColor={Colors.textMuted}
                  value={remarkText}
                  onChangeText={setRemarkText}
                  multiline
                  numberOfLines={3}
                />

                <Button
                  variant="primary"
                  onPress={handleRemark}
                  loading={remarkSaving}
                  disabled={!remarkText.trim()}
                >
                  Save Behaviour Remark
                </Button>
              </Card>

              {/* Today's remarks */}
              {(studentLogs.length > 0 || loadingLogs) && (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.sectionLabel}>Today's Remarks</Text>
                  {loadingLogs ? (
                    <ActivityIndicator size="small" color={Colors.brand} />
                  ) : (
                    <View style={{ gap: 8 }}>
                      {studentLogs.map((log, i) => {
                        const ti = getTypeInfo(log.type);
                        return (
                          <View key={i} style={[styles.logItem, { backgroundColor: ti.bg, borderLeftColor: ti.color }]}>
                            <View style={styles.logHeader}>
                              <Text style={[styles.logType, { color: ti.color }]}>{log.type.toUpperCase()}</Text>
                              <Text style={styles.logTime}>
                                {log.created_at ? new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </Text>
                            </View>
                            <Text style={styles.logNote}>{log.note}</Text>
                            {log.teacher_name && <Text style={styles.logTeacher}>— {log.teacher_name}</Text>}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  searchHeader: { backgroundColor: Colors.white, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface2, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 13, color: Colors.text, padding: 0 },
  filterRow: { gap: 8, paddingRight: 16 },
  pillBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  pillBtnActive: { backgroundColor: Colors.brand },
  pillBtnInactive: { backgroundColor: Colors.surface2 },
  pillText: { fontSize: 12, fontWeight: '700' },
  pillTextActive: { color: Colors.white },
  pillTextInactive: { color: Colors.textSecondary },
  listContent: { padding: 16, gap: 12 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 13, color: Colors.textMuted, marginTop: 8 },
  gridCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  studentName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  studentRoll: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, backgroundColor: Colors.surface2, padding: 8, borderRadius: Radius.sm, alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5 },
  statValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalStudentName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  modalStudentRoll: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  closeBtn: { padding: 4 },
  modalScroll: { padding: 16, gap: 14, paddingBottom: 40 },
  modalStatsRow: { flexDirection: 'row', gap: 10 },
  modalStatBox: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, alignItems: 'center', borderStyle: 'solid', borderWidth: 1, borderColor: Colors.border },
  modalStatLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  modalStatValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  contactContainer: { gap: 8 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 10, borderWidth: 1, borderColor: Colors.border },
  contactRole: { fontSize: 10, color: Colors.textMuted },
  contactName: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: 2 },
  emptyText: { fontSize: 12, color: Colors.textMuted, paddingVertical: 6, textAlign: 'center' },

  // Add Remark
  remarkTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  remarkTypeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 2 },
  remarkTypeText: { fontSize: 11, fontWeight: '700' },
  remarkInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.surface2, fontSize: 13, color: Colors.text, textAlignVertical: 'top', height: 80 },

  // Logs
  logItem: { padding: 12, borderRadius: Radius.md, borderLeftWidth: 3 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logType: { fontSize: 10, fontWeight: '800' },
  logTime: { fontSize: 10, color: Colors.textMuted },
  logNote: { fontSize: 13, color: Colors.text },
  logTeacher: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
});
