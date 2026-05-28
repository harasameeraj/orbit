import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Colors, Radius } from '../../theme/colors';

export default function TeacherDashboard({ navigation }) {
  const { user, profile } = useAuth();
  const { students, attendance, homework, announcements, timetable, reloadData, loadingData, addAnnouncement } = useData();

  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [posting, setPosting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  // Academic year calculation
  const nowDate = new Date();
  const acadYear = nowDate.getMonth() >= 3
    ? `${nowDate.getFullYear()}-${(nowDate.getFullYear() + 1).toString().slice(-2)}`
    : `${nowDate.getFullYear() - 1}-${nowDate.getFullYear().toString().slice(-2)}`;

  // Attendance stats
  const markedToday = Object.values(attendance).some(records => records.some(r => r.date === today));
  const presentToday = Object.values(attendance).filter(records => records.some(r => r.date === today && r.status === 'present')).length;

  // Timetable
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDay = days[new Date().getDay()] || 'Monday';
  const todaySchedule = timetable[todayDay] || timetable['Monday'] || [];

  const handlePostAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) return;
    setPosting(true);
    try {
      await addAnnouncement({ title: annTitle, body: annBody });
      setAnnTitle('');
      setAnnBody('');
      setShowAnnModal(false);
    } catch (_e) {
      // silent
    }
    setPosting(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loadingData} onRefresh={reloadData} tintColor={Colors.brand} />}
      >
        {/* Hero banner */}
        <View style={styles.hero}>
          <Text style={styles.heroSchool}>{profile?.schools?.name || 'School Portal'}</Text>
          <Text style={styles.heroDate}>{todayDate}</Text>
          <View style={styles.heroSession}>
            <Ionicons name="book-outline" size={14} color={Colors.white} />
            <Text style={styles.heroSessionText}>Academic Session {acadYear}</Text>
          </View>
        </View>

        {/* Status cards */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="checkmark-circle-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
            <Text style={[styles.statValue, { color: markedToday ? Colors.accentGreen : Colors.accentAmber }]}>
              {markedToday ? 'Marked' : 'Pending'}
            </Text>
            <Text style={styles.statSub}>
              {markedToday ? `${presentToday}/${students.length} present` : 'Not marked yet'}
            </Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="star-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.statLabel}>Marks Upload</Text>
            </View>
            <Text style={[styles.statValue, { color: Colors.accentGreen }]}>Up to date</Text>
            <Text style={styles.statSub}>All marks uploaded</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.statLabel}>Presence</Text>
            </View>
            <Text style={styles.statValue}>{presentToday}/{students.length}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${students.length > 0 ? (presentToday / students.length) * 100 : 0}%` },
                ]}
              />
            </View>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Attendance')}>
              <Ionicons name="checkbox-outline" size={18} color={Colors.white} />
              <Text style={styles.actionBtnText}>Mark Attendance</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => navigation.navigate('Marks')}>
              <Ionicons name="star-outline" size={18} color={Colors.brand} />
              <Text style={[styles.actionBtnText, styles.actionBtnTextOutline]}>Upload Marks</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGhost]} onPress={() => setShowAnnModal(true)}>
              <Ionicons name="megaphone-outline" size={18} color={Colors.textSecondary} />
              <Text style={[styles.actionBtnText, styles.actionBtnTextGhost]}>Announcement</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.twoColumn}>
          {/* Today's Schedule */}
          <View style={styles.column}>
            <View style={styles.columnHeader}>
              <Text style={styles.sectionTitle}>Today's periods</Text>
            </View>
            {todaySchedule.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>No periods scheduled for today</Text>
              </Card>
            ) : (
              <View style={{ gap: 8 }}>
                {todaySchedule.map((period, i) => {
                  const now = new Date();
                  const nowMins = now.getHours() * 60 + now.getMinutes();
                  const [ph, pm] = (period.time || '00:00').split(':').map(Number);
                  const periodStart = ph * 60 + pm;
                  const periodEnd = periodStart + 40;
                  const isActive = nowMins >= periodStart && nowMins < periodEnd;

                  return (
                    <Card key={i} style={styles.periodCard}>
                      <View style={styles.periodRow}>
                        <Text style={styles.periodTime}>{period.time}</Text>
                        <View style={[styles.periodIndicator, { backgroundColor: isActive ? Colors.accentGreen : Colors.border }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.periodSubject}>{period.subject}</Text>
                          <Text style={styles.periodTopic}>{period.topic || 'General'}</Text>
                        </View>
                        <Badge variant={isActive ? 'green' : 'brand'}>
                          {isActive ? 'Active' : 'Upcoming'}
                        </Badge>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>

          {/* Recent Homework */}
          <View style={styles.column}>
            <View style={styles.columnHeader}>
              <Text style={styles.sectionTitle}>Recent Homework</Text>
            </View>
            {homework.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>No homework posted yet</Text>
              </Card>
            ) : (
              <View style={{ gap: 8 }}>
                {homework.slice(0, 3).map(hw => {
                  const dueDate = hw.due_date || hw.dueDate || '';
                  const isPastDue = dueDate && new Date(dueDate) < new Date();

                  return (
                    <Card key={hw.id} style={styles.hwCard}>
                      <View style={styles.hwHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.hwTitle} numberOfLines={1}>{hw.title}</Text>
                          <Text style={styles.hwMeta}>
                            {hw.subject} • Due {dueDate ? new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                          </Text>
                        </View>
                        <Badge variant={isPastDue ? 'amber' : 'green'}>
                          {isPastDue ? 'Past Due' : 'Active'}
                        </Badge>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}

            {/* Overview alert */}
            {homework.length > 0 && (
              <Card style={[styles.alertCard, { borderLeftColor: announcements.length > 0 ? Colors.accentGreen : Colors.accentAmber }]}>
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={announcements.length > 0 ? Colors.accentGreen : Colors.accentAmber}
                />
                <View>
                  <Text style={styles.alertTitle}>{homework.length} homework assigned</Text>
                  <Text style={styles.alertSub}>{announcements.length} announcement(s) posted</Text>
                </View>
              </Card>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Post Announcement Modal */}
      <Modal
        visible={showAnnModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAnnModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post Announcement</Text>
              <TouchableOpacity onPress={() => setShowAnnModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Announcement Title"
                placeholderTextColor={Colors.textMuted}
                value={annTitle}
                onChangeText={setAnnTitle}
              />

              <Text style={[styles.modalLabel, { marginTop: 12 }]}>Announcement Details</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write announcement details for parents..."
                placeholderTextColor={Colors.textMuted}
                value={annBody}
                onChangeText={setAnnBody}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalActions}>
                <Button
                  variant="primary"
                  style={{ flex: 1 }}
                  onPress={handlePostAnnouncement}
                  loading={posting}
                >
                  Post Announcement
                </Button>
                <Button
                  variant="ghost"
                  style={{ flex: 1 }}
                  onPress={() => setShowAnnModal(false)}
                >
                  Cancel
                </Button>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: Colors.brand,
    borderRadius: Radius['2xl'],
    padding: 24,
  },
  heroSchool: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  heroDate: { fontSize: 22, fontWeight: '800', color: Colors.white, marginBottom: 12 },
  heroSession: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'flex-start' },
  heroSessionText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, padding: 12 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  statLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted },
  statValue: { fontSize: 16, fontWeight: '800', color: Colors.text },
  statSub: { fontSize: 9, color: Colors.textMuted, marginTop: 4 },
  progressBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: Colors.accentGreen, borderRadius: 2 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  actionsGrid: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, backgroundColor: Colors.brand, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.brand },
  actionBtnGhost: { backgroundColor: Colors.surface2 },
  actionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 11 },
  actionBtnTextOutline: { color: Colors.brand },
  actionBtnTextGhost: { color: Colors.textSecondary },
  twoColumn: { gap: 16 },
  column: { gap: 10 },
  columnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyCard: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 12, color: Colors.textMuted },
  periodCard: { padding: 12 },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  periodTime: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, width: 40, textAlign: 'center' },
  periodIndicator: { width: 3, height: 28, borderRadius: 1.5 },
  periodSubject: { fontSize: 13, fontWeight: '700', color: Colors.text },
  periodTopic: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  hwCard: { padding: 12 },
  hwHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  hwTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  hwMeta: { fontSize: 11, color: Colors.textMuted },
  alertCard: { padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderLeftWidth: 3, borderRadius: Radius.sm },
  alertTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  alertSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: 4 },
  modalBody: { gap: 8 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.surface2,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
