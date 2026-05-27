import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabase';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import { Colors, Radius, Shadows } from '../../theme/colors';

export default function TeacherChat() {
  const { user, profile } = useAuth();
  const { students, messages, loadMessages, sendMessage } = useData();

  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  const flatListRef = useRef(null);

  // Chat hours logic (8 AM – 5 PM)
  const chatHourStart = 8;
  const chatHourEnd = 17;
  const currentHour = new Date().getHours();
  const withinChatHours = currentHour >= chatHourStart && currentHour < chatHourEnd;

  const loadTeacherThreads = async () => {
    if (!user) return;
    setLoadingThreads(true);
    try {
      const { data, error } = await supabase
        .from('message_threads')
        .select(`
          id, parent_id, student_id,
          parent:profiles!message_threads_parent_id_fkey(id, name),
          student:students(id, name, roll_no)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setThreads(data || []);
    } catch (e) {
      console.error('loadTeacherThreads error:', e);
    }
    setLoadingThreads(false);
  };

  useEffect(() => {
    loadTeacherThreads();
  }, [user]);

  const selectThread = async (thread) => {
    setSelectedThread(thread);
    setShowChatModal(true);
    await loadMessages(thread.parent_id, user.id, thread.student_id);
  };

  const initiateFromStudent = async (student) => {
    // Check if thread already exists
    const existing = threads.find(t => t.student_id === student.id);
    if (existing) {
      selectThread(existing);
      return;
    }

    setLoadingThreads(true);
    try {
      // Find parent linked to student
      const { data: link } = await supabase
        .from('parent_students')
        .select('parent_id')
        .eq('student_id', student.id)
        .maybeSingle();

      if (!link?.parent_id) {
        Alert.alert('Unavailable', `No parent account linked to ${student.name} yet.`);
        setLoadingThreads(false);
        return;
      }

      // Fetch parent profile
      const { data: parentProfile } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', link.parent_id)
        .maybeSingle();

      const thread = await loadMessages(link.parent_id, user.id, student.id);
      const newThread = {
        id: thread.id,
        parent_id: link.parent_id,
        student_id: student.id,
        parent: parentProfile || { id: link.parent_id, name: 'Parent' },
        student: { id: student.id, name: student.name, roll_no: student.roll_no },
      };

      setThreads(prev => [newThread, ...prev.filter(t => t.id !== thread.id)]);
      setSelectedThread(newThread);
      setShowChatModal(true);
    } catch (e) {
      console.error('initiateFromStudent error:', e);
    }
    setLoadingThreads(false);
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedThread || sending) return;
    setSending(true);
    try {
      await sendMessage(selectedThread.id, text);
      setText('');
    } catch (e) {
      console.error('Send error:', e);
    }
    setSending(false);
  };

  // Find students without thread
  const studentsWithoutThread = students.filter(s => !threads.some(t => t.student_id === s.id));

  const parentName = selectedThread?.parent?.name || 'Parent';
  const studentName = selectedThread?.student?.name || '';
  const parentInitial = parentName.charAt(0);
  const teacherInitial = profile?.name?.charAt(0) || 'T';

  const renderMessage = ({ item: msg }) => {
    const isMe = msg.sender_id === user.id;
    const time = msg.sent_at
      ? new Date(msg.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <View style={[styles.msgRow, isMe && { justifyContent: 'flex-end' }]}>
        {!isMe && <Avatar name={parentName} size={28} style={{ backgroundColor: Colors.accentGreen }} />}
        <View style={{ maxWidth: '75%' }}>
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={[styles.bubbleText, isMe && { color: Colors.white }]}>{msg.text}</Text>
          </View>
          <Text style={[styles.time, isMe && { textAlign: 'right' }]}>{time}</Text>
        </View>
        {isMe && <Avatar name={profile?.name} size={28} style={{ backgroundColor: Colors.brandLight }} />}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={loadingThreads} onRefresh={loadTeacherThreads} tintColor={Colors.brand} />}
      >
        {/* Active Conversations */}
        <Text style={styles.sectionLabel}>Conversations</Text>
        {loadingThreads && threads.length === 0 ? (
          <ActivityIndicator size="small" color={Colors.brand} style={{ marginVertical: 20 }} />
        ) : threads.length === 0 ? (
          <Text style={styles.emptyText}>No active conversations</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {threads.map(t => (
              <TouchableOpacity
                key={t.id}
                style={styles.threadCard}
                onPress={() => selectThread(t)}
              >
                <Avatar name={t.parent?.name || 'Parent'} size={40} style={{ backgroundColor: Colors.accentGreen }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.threadName}>{t.parent?.name || 'Parent'}</Text>
                  <Text style={styles.threadStudent}>Regarding: {t.student?.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Start New Chat List */}
        {studentsWithoutThread.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionLabel}>Start New Chat</Text>
            <View style={{ gap: 10 }}>
              {studentsWithoutThread.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.studentInitiateRow}
                  onPress={() => initiateFromStudent(s)}
                >
                  <Avatar name={s.name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.threadName}>{s.name}</Text>
                    <Text style={styles.threadStudent}>Roll: {s.roll_no || '—'}</Text>
                  </View>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.brand} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Chat Thread Modal */}
      <Modal
        visible={showChatModal}
        animationType="slide"
        onRequestClose={() => setShowChatModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowChatModal(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalParentName}>{parentName}</Text>
              <Text style={styles.modalStudentName}>Parent of {studentName}</Text>
            </View>
            <View style={styles.hoursIndicator}>
              <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
              <View style={[styles.statusDot, { backgroundColor: withinChatHours ? Colors.accentGreen : Colors.accentRed }]} />
            </View>
          </View>

          {/* Student Context Banner */}
          <View style={styles.contextBanner}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.contextText}>
              Student: {studentName} {selectedThread?.student?.roll_no ? `(Roll: ${selectedThread.student.roll_no})` : ''}
            </Text>
          </View>

          {/* Message List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, idx) => item.id || String(idx)}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.centeredEmpty}>
                <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} style={{ opacity: 0.3, marginBottom: 8 }} />
                <Text style={{ fontWeight: '600', color: Colors.textSecondary }}>No messages yet</Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>Start the chat with {parentName}</Text>
              </View>
            }
          />

          {/* Input Bar */}
          <View style={styles.inputBar}>
            {!withinChatHours && (
              <View style={styles.hoursWarning}>
                <Ionicons name="warning-outline" size={14} color="#92400e" />
                <Text style={styles.warningText}>Outside hours. Messages open 8 AM – 5 PM.</Text>
              </View>
            )}
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, !withinChatHours && { backgroundColor: Colors.surface2 }]}
                placeholder="Type a message..."
                placeholderTextColor={Colors.textMuted}
                value={text}
                onChangeText={setText}
                multiline
                editable={withinChatHours}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!text.trim() || !withinChatHours || sending) && { opacity: 0.4 }]}
                onPress={handleSend}
                disabled={!text.trim() || !withinChatHours || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Ionicons name="send" size={16} color={Colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  listContainer: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  emptyText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  threadName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  threadStudent: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  studentInitiateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Modal chat styles
  modalContainer: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  modalParentName: { fontSize: 15, fontWeight: '800', color: Colors.text },
  modalStudentName: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  hoursIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  contextBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: Colors.surface2, borderBottomWidth: 1, borderBottomColor: Colors.border },
  contextText: { fontSize: 12, color: Colors.textSecondary },
  messagesList: { padding: 16, paddingBottom: 10, flexGrow: 1, justifyContent: 'flex-end' },
  centeredEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 40 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  bubble: { padding: 12, borderRadius: 16, maxWidth: '100%' },
  bubbleMe: { backgroundColor: Colors.brand, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontSize: 13, lineHeight: 18, color: Colors.text },
  time: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  inputBar: { padding: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  hoursWarning: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  warningText: { color: '#92400e', fontSize: 11, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  textInput: { flex: 1, backgroundColor: Colors.surface2, borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: Colors.text, maxHeight: 80, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { backgroundColor: Colors.brand, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
