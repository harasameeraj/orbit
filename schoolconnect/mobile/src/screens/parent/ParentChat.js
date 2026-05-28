import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabase';
import Avatar from '../../components/ui/Avatar';
import ChildSwitcher from '../../components/shared/ChildSwitcher';
import { Colors, Radius } from '../../theme/colors';

export default function ParentChat() {
  const { user, profile } = useAuth();
  const { students, activeStudent, messages, loadMessages, sendMessage } = useData();
  const [text, setText] = useState('');
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  const student = activeStudent || students[0];

  useEffect(() => {
    if (!user || !student || !profile) return;
    initChat();
  }, [user, student, profile]);

  async function initChat() {
    setLoading(true);
    try {
      const { data: tc } = await supabase.from('teacher_classes')
        .select('teacher_id, profiles(id, name)')
        .eq('class_id', student.class_id)
        .eq('is_class_teacher', true)
        .maybeSingle();

      const teacherId = tc?.teacher_id;
      if (!teacherId) { setLoading(false); return; }

      const th = await loadMessages(user.id, teacherId, student.id);
      setThread({ ...th, teacher: tc?.profiles });
    } catch (_e) {
      // silent
    }
    setLoading(false);
  }

  const handleSend = async () => {
    if (!text.trim() || !thread || sending) return;
    setSending(true);
    try {
      await sendMessage(thread.id, text);
      setText('');
    } catch (_e) {
      // silent
    }
    setSending(false);
  };

  const teacherName = thread?.teacher?.name || 'Class Teacher';

  const renderMessage = ({ item: msg }) => {
    const isMe = msg.sender_id === user.id;
    const time = msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

    return (
      <View style={[styles.msgRow, isMe && { justifyContent: 'flex-end' }]}>
        {!isMe && <Avatar name={teacherName} size={28} style={{ backgroundColor: Colors.brand }} />}
        <View style={{ maxWidth: '75%' }}>
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={[styles.bubbleText, isMe && { color: Colors.white }]}>{msg.text}</Text>
          </View>
          <Text style={[styles.time, isMe && { textAlign: 'right' }]}>{time}</Text>
        </View>
        {isMe && <Avatar name={profile?.name} size={28} style={{ backgroundColor: Colors.accentGreenLight }} />}
      </View>
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.brand} /></View>;
  }

  return (
    <View style={styles.container}>
      <ChildSwitcher />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar name={teacherName} size={40} style={{ backgroundColor: Colors.brand }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: Colors.text }}>{teacherName}</Text>
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>Class Teacher</Text>
        </View>
      </View>

      {/* Student context */}
      {student && (
        <View style={styles.contextBar}>
          <Ionicons name="chatbubble-outline" size={14} color={Colors.textMuted} />
          <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Regarding: <Text style={{ fontWeight: '700' }}>{student.name}</Text></Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, i) => item.id || String(i)}
        contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1, justifyContent: messages.length === 0 ? 'center' : 'flex-end' }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="chatbubbles-outline" size={40} color={Colors.textMuted} style={{ marginBottom: 8, opacity: 0.4 }} />
            <Text style={{ fontWeight: '600', color: Colors.textSecondary }}>No messages yet</Text>
            <Text style={{ fontSize: 13, color: Colors.textMuted }}>Start the conversation</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="send" size={18} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  contextBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.surface2, borderBottomWidth: 1, borderBottomColor: Colors.border },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  bubble: { padding: 12, borderRadius: 16, maxWidth: '100%' },
  bubbleMe: { backgroundColor: Colors.brand, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontSize: 14, lineHeight: 20, color: Colors.text },
  time: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  textInput: { flex: 1, backgroundColor: Colors.surface2, borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: Colors.text, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { backgroundColor: Colors.brand, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
