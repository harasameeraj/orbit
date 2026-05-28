import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Image,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import ChildSwitcher from '../../components/shared/ChildSwitcher';
import { Colors, Radius, Shadows } from '../../theme/colors';

export default function ParentHomework() {
  const { homework, reloadData, loadingData } = useData();

  const now = new Date();

  // Only show homework that hasn't passed its due date
  const active = homework.filter(h => {
    const due = new Date(h.due_date || h.dueDate || 0);
    return due >= now;
  }).sort((a, b) => new Date(a.due_date || a.dueDate || 0) - new Date(b.due_date || b.dueDate || 0)); // soonest first

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const due = new Date(dateStr);
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    return `${diff} days left`;
  };

  const getStatusVariant = (dateStr) => {
    if (!dateStr) return 'muted';
    const due = new Date(dateStr);
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (diff <= 1) return 'amber';
    return 'green';
  };

  return (
    <View style={styles.container}>
      <ChildSwitcher />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loadingData} onRefresh={reloadData} tintColor={Colors.brand} />}
      >
        {/* Summary bar */}
        <View style={styles.summaryBar}>
          <Ionicons name="book" size={20} color={Colors.brand} />
          <Text style={styles.summaryText}>
            {active.length === 0 ? 'No pending homework' : `${active.length} active assignment${active.length !== 1 ? 's' : ''}`}
          </Text>
        </View>

        {/* Homework list */}
        {active.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.accentGreen} style={{ opacity: 0.5, marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>All caught up! 🎉</Text>
              <Text style={styles.emptySubtitle}>
                No pending homework. When your child's teacher posts new homework, it will appear here.
              </Text>
            </View>
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            {active.map((hw) => {
              const dueDate = hw.due_date || hw.dueDate;
              const statusVariant = getStatusVariant(dueDate);
              const timeLeft = daysUntil(dueDate);
              const teacherName = hw.profiles?.name || 'Teacher';

              return (
                <Card key={hw.id} style={styles.hwCard}>
                  {/* Header */}
                  <View style={styles.hwHeader}>
                    <View style={styles.subjectPill}>
                      <Ionicons name="book" size={12} color={Colors.brand} />
                      <Text style={styles.subjectText}>{hw.subject || 'General'}</Text>
                    </View>
                    <Badge variant={statusVariant}>
                      {timeLeft || 'No due date'}
                    </Badge>
                  </View>

                  {/* Title */}
                  <Text style={styles.hwTitle}>{hw.title}</Text>

                  {/* Description */}
                  {hw.description ? (
                    <View style={styles.descriptionBox}>
                      <Ionicons name="document-text-outline" size={14} color={Colors.textMuted} style={{ marginTop: 2 }} />
                      <Text style={styles.descriptionText}>{hw.description}</Text>
                    </View>
                  ) : null}

                  {/* Image attachment */}
                  {hw.image_url ? (
                    <TouchableOpacity
                      style={styles.imageContainer}
                      onPress={() => Linking.openURL(hw.image_url).catch(() => {})}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: hw.image_url }} style={styles.hwImage} resizeMode="cover" />
                      <View style={styles.imageOverlay}>
                        <Ionicons name="expand-outline" size={16} color={Colors.white} />
                        <Text style={styles.imageOverlayText}>Tap to view full image</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}

                  {/* Footer: due date + teacher */}
                  <View style={styles.hwFooter}>
                    <View style={styles.footerItem}>
                      <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.footerText}>Due: {formatDate(dueDate)}</Text>
                    </View>
                    <View style={styles.footerItem}>
                      <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.footerText}>{teacherName}</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },

  // Summary
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 10,
    ...Shadows.sm,
  },
  summaryText: { fontSize: 14, fontWeight: '700', color: Colors.text },

  // Empty
  emptyCard: { padding: 32 },
  emptyState: { alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  // Homework card
  hwCard: { padding: 16 },
  hwHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.brandLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  subjectText: { fontSize: 11, fontWeight: '700', color: Colors.brand },
  hwTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 8, lineHeight: 22 },

  // Description
  descriptionBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.surface2,
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 12,
  },
  descriptionText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  // Image
  imageContainer: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  hwImage: { width: '100%', height: 180, borderRadius: Radius.md },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  imageOverlayText: { fontSize: 11, fontWeight: '600', color: Colors.white },

  // Footer
  hwFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
});
