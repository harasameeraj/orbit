import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Colors, Radius } from '../../theme/colors';
import { upsertMarks, publishMarks, getMarksByClass, supabase, uploadHomeworkImage } from '../../lib/supabase';

const SUBJECTS = ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi', 'Physical Education'];
const EXAM_TYPES = ['Unit Test 1', 'Unit Test 2', 'Unit Test 3', 'Mid Term', 'Final Exam', 'Assignment'];

export default function TeacherMarks({ route }) {
  const { user } = useAuth();
  const { students, addHomework, reloadData, loadingData, classId, schoolId } = useData();

  const [tab, setTab] = useState(route?.params?.tab || 'marks'); // 'marks' or 'homework'

  // Switch tab if navigated with a param (e.g. from dashboard "Post Homework" button)
  useEffect(() => {
    if (route?.params?.tab) setTab(route.params.tab);
  }, [route?.params?.tab]);

  // Marks State
  const [subject, setSubject] = useState('Mathematics');
  const [examType, setExamType] = useState('Unit Test 1');
  const [scores, setScores] = useState({});
  const [loadingScores, setLoadingScores] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Homework State
  const [hwTitle, setHwTitle] = useState('');
  const [hwSubject, setHwSubject] = useState('Mathematics');
  const [hwDue, setHwDue] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwImage, setHwImage] = useState(null);
  const [hwLoading, setHwLoading] = useState(false);

  // Picker modals
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showExamPicker, setShowExamPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('marks'); // 'marks' or 'hw'

  // Sync and fetch marks from classId
  const loadExistingScores = async () => {
    if (!classId || !subject || !examType || !students.length) return;
    setLoadingScores(true);
    try {
      const data = await getMarksByClass(classId, subject, examType);
      const dbScores = {};
      students.forEach(s => {
        dbScores[s.id] = '';
      });
      if (data && data.length > 0) {
        data.forEach(row => {
          dbScores[row.student_id] = row.score.toString();
        });
      }
      setScores(dbScores);
    } catch (_err) {
      // silent
    }
    setLoadingScores(false);
  };

  useEffect(() => {
    loadExistingScores();
  }, [classId, subject, examType, students]);

  const buildRecords = (published) => {
    return students
      .filter(s => scores[s.id] !== undefined && scores[s.id] !== '')
      .map(s => ({
        school_id: schoolId,
        student_id: s.id,
        class_id: s.class_id || classId,
        teacher_id: user.id,
        subject,
        exam_type: examType,
        score: parseInt(scores[s.id]) || 0,
        max_score: 100,
        published,
      }));
  };

  const handleSaveDraft = async () => {
    const records = buildRecords(false);
    if (!records.length) {
      Alert.alert('Error', 'Enter at least one score before saving.');
      return;
    }
    setSavingDraft(true);
    try {
      await upsertMarks(records);
      Alert.alert('Success', 'Draft saved. Marks are not visible to parents yet.');
    } catch (e) {
      Alert.alert('Error', 'Save failed: ' + e.message);
    }
    setSavingDraft(false);
  };

  const handlePublish = async () => {
    const records = buildRecords(true);
    if (!records.length) {
      Alert.alert('Error', 'Enter at least one score before publishing.');
      return;
    }
    setPublishing(true);
    try {
      await upsertMarks(records);
      if (classId) await publishMarks(classId, subject, examType);

      // Trigger push notification (Edge function)
      supabase.functions
        .invoke('send-notification', {
          body: {
            type: 'marks',
            title: `${subject} marks published`,
            body: `${examType} marks for ${subject} are now available. Check your child's performance.`,
            school_id: schoolId,
            class_id: classId,
          },
        })
        .catch(() => {});

      Alert.alert('Success', 'Marks published! Parents have been notified.');
    } catch (e) {
      Alert.alert('Error', 'Publish failed: ' + e.message);
    }
    setPublishing(false);
  };

  const pickImage = async (useCamera) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library permission is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        });
      }
      if (!result.canceled && result.assets?.[0]) {
        setHwImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open image picker: ' + e.message);
    }
  };

  // Normalize DD-MM-YYYY or DD/MM/YYYY → YYYY-MM-DD
  const normalizeDueDate = (input) => {
    if (!input) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input; // already correct
    const parts = input.split(/[-\/]/);
    if (parts.length === 3 && parts[0].length <= 2) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return input;
  };

  const handlePostHw = async () => {
    if (!hwTitle.trim()) {
      Alert.alert('Error', 'Please enter a homework title.');
      return;
    }
    setHwLoading(true);
    try {
      // Try image upload — if it fails, post homework without image
      let imageUrl = null;
      if (hwImage) {
        try {
          imageUrl = await uploadHomeworkImage(hwImage);
        } catch (imgErr) {
          console.warn('Image upload failed:', imgErr?.message);
          // Continue posting without image
        }
      }

      await addHomework({
        subject: hwSubject,
        title: hwTitle,
        description: hwDesc,
        due_date: normalizeDueDate(hwDue),
        is_draft: false,
        ...(imageUrl ? { image_url: imageUrl } : {}),
      });
      setHwTitle('');
      setHwDesc('');
      setHwDue('');
      setHwImage(null);
      const msg = hwImage && !imageUrl
        ? 'Homework posted! (Image could not be uploaded — try again later)'
        : 'Homework posted! Parents in your class have been notified.';
      Alert.alert('Success', msg);
    } catch (e) {
      Alert.alert('Error', 'Failed: ' + e.message);
    }
    setHwLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'marks' && styles.tabButtonActive]}
          onPress={() => setTab('marks')}
        >
          <Text style={[styles.tabText, tab === 'marks' && styles.tabTextActive]}>Upload Marks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'homework' && styles.tabButtonActive]}
          onPress={() => setTab('homework')}
        >
          <Text style={[styles.tabText, tab === 'homework' && styles.tabTextActive]}>Post Homework</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {tab === 'marks' ? (
          <View style={{ gap: 16 }}>
            {/* Subject + Exam Selection */}
            <Card style={styles.selectorCard}>
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Select Subject</Text>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => {
                    setPickerTarget('marks');
                    setShowSubjectPicker(true);
                  }}
                >
                  <Text style={styles.pickerBtnText}>{subject}</Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={[styles.pickerWrapper, { marginTop: 12 }]}>
                <Text style={styles.pickerLabel}>Exam Type</Text>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setShowExamPicker(true)}
                >
                  <Text style={styles.pickerBtnText}>{examType}</Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </Card>

            {/* Score lists */}
            <Card style={{ padding: 16 }}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Student Records</Text>
                <Text style={styles.listSubtitle}>{students.length} Students</Text>
              </View>

              {loadingScores ? (
                <ActivityIndicator size="small" color={Colors.brand} style={{ padding: 20 }} />
              ) : students.length === 0 ? (
                <Text style={styles.emptyText}>No students found in your class</Text>
              ) : (
                <View>
                  {students.map((student) => {
                    const score = scores[student.id] ?? '';
                    const numScore = parseInt(score);
                    const color =
                      score === ''
                        ? Colors.textMuted
                        : numScore >= 80
                        ? Colors.accentGreen
                        : numScore >= 50
                        ? Colors.brand
                        : Colors.accentRed;

                    return (
                      <View key={student.id} style={styles.studentScoreRow}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarText}>
                            {(student.name || '?')
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.studentName}>{student.name}</Text>
                          <Text style={styles.studentRoll}>Roll No: {student.roll_no || '—'}</Text>
                        </View>

                        <View style={styles.inputScoreWrapper}>
                          <TextInput
                            style={[styles.scoreInput, { color }]}
                            value={score}
                            placeholder="—"
                            placeholderTextColor={Colors.textMuted}
                            onChangeText={(text) => {
                              if (text === '') {
                                setScores((prev) => ({ ...prev, [student.id]: '' }));
                              } else {
                                const valInt = parseInt(text);
                                if (!isNaN(valInt) && valInt >= 0 && valInt <= 100) {
                                  setScores((prev) => ({ ...prev, [student.id]: text }));
                                }
                              }
                            }}
                            keyboardType="numeric"
                            maxLength={3}
                          />
                          <Text style={styles.maxMarks}>/100</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>

            <View style={styles.buttonRow}>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={handleSaveDraft}
                loading={savingDraft}
              >
                Save Draft
              </Button>
              <Button
                variant="primary"
                style={{ flex: 2, backgroundColor: Colors.accentGreen, borderColor: Colors.accentGreen }}
                onPress={handlePublish}
                loading={publishing}
              >
                Publish Marks
              </Button>
            </View>
          </View>
        ) : (
          /* Homework Tab */
          <Card style={styles.hwFormCard}>
            <Text style={styles.formTitle}>Create Homework</Text>
            <View style={{ gap: 14 }}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Homework Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Quadratic Equations Practice"
                  placeholderTextColor={Colors.textMuted}
                  value={hwTitle}
                  onChangeText={setHwTitle}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Select Subject</Text>
                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={() => {
                      setPickerTarget('hw');
                      setShowSubjectPicker(true);
                    }}
                  >
                    <Text style={styles.pickerBtnText}>{hwSubject}</Text>
                    <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Due Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 2026-06-15"
                    placeholderTextColor={Colors.textMuted}
                    value={hwDue}
                    onChangeText={setHwDue}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description & Instructions</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Describe assignment details..."
                  placeholderTextColor={Colors.textMuted}
                  value={hwDesc}
                  onChangeText={setHwDesc}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Image attachment */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Attach Photo (Optional)</Text>
                {hwImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: hwImage }} style={styles.imagePreview} resizeMode="cover" />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => setHwImage(null)}>
                      <Ionicons name="close-circle" size={26} color={Colors.accentRed} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imageBtnRow}>
                    <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage(true)}>
                      <Ionicons name="camera-outline" size={20} color={Colors.brand} />
                      <Text style={styles.imagePickerBtnText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage(false)}>
                      <Ionicons name="image-outline" size={20} color={Colors.brand} />
                      <Text style={styles.imagePickerBtnText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.noteBox}>
                <Text style={styles.noteTitle}>Teacher's Note</Text>
                <Text style={styles.noteText}>
                  Homework posted here will be instantly notified to all parents in your class.
                </Text>
              </View>

              <Button variant="primary" onPress={handlePostHw} loading={hwLoading}>
                Post Homework
              </Button>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Subject Picker Modal */}
      <Modal
        visible={showSubjectPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubjectPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSubjectPicker(false)}
        >
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Subject</Text>
            <FlatList
              data={SUBJECTS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    if (pickerTarget === 'marks') {
                      setSubject(item);
                    } else {
                      setHwSubject(item);
                    }
                    setShowSubjectPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Exam Picker Modal */}
      <Modal
        visible={showExamPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExamPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowExamPicker(false)}
        >
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Exam Type</Text>
            <FlatList
              data={EXAM_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setExamType(item);
                    setShowExamPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: Colors.brand },
  tabText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  tabTextActive: { color: Colors.brand },
  scrollContent: { padding: 16, gap: 16 },
  selectorCard: { padding: 16 },
  pickerWrapper: { gap: 6 },
  pickerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  pickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface2,
  },
  pickerBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  listTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  listSubtitle: { fontSize: 11, color: Colors.textMuted },
  emptyText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  studentScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', color: Colors.brand, fontSize: 11 },
  studentName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  studentRoll: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  inputScoreWrapper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    width: 60,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 15,
    backgroundColor: Colors.white,
  },
  maxMarks: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  buttonRow: { flexDirection: 'row', gap: 10 },
  hwFormCard: { padding: 20 },
  formTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 14 },
  formGroup: { gap: 6 },
  formRow: { flexDirection: 'row', gap: 12 },
  formLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: Colors.text,
    backgroundColor: Colors.surface2,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  noteBox: { backgroundColor: Colors.accentGreenLight, padding: 12, borderRadius: Radius.md },
  noteTitle: { fontSize: 12, fontWeight: '700', color: Colors.accentGreen, marginBottom: 2 },
  noteText: { fontSize: 11, color: Colors.accentGreen, lineHeight: 16 },

  // Image picker
  imageBtnRow: { flexDirection: 'row', gap: 12 },
  imagePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.brand,
    borderRadius: Radius.md,
    paddingVertical: 12,
    backgroundColor: Colors.brandLight,
  },
  imagePickerBtnText: { fontSize: 13, fontWeight: '700', color: Colors.brand },
  imagePreviewContainer: { position: 'relative', borderRadius: Radius.md, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 180, borderRadius: Radius.md },
  removeImageBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: Colors.white, borderRadius: 13 },

  // Picker Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  pickerModalContent: { backgroundColor: Colors.white, borderRadius: Radius.lg, width: '90%', maxHeight: '60%', padding: 16 },
  pickerModalTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 12, textAlign: 'center' },
  pickerItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerItemText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
});
