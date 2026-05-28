import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import Card from '../../components/ui/Card';
import ChildSwitcher from '../../components/shared/ChildSwitcher';
import { Colors, Radius } from '../../theme/colors';

export default function ParentMarks() {
  const { marks, students, activeStudent, attendance, reloadData, loadingData } = useData();
  const student = activeStudent || students?.[0];
  const studentId = student?.id;
  const studentMarks = (studentId ? marks[studentId] : null) || [];
  const firstName = (student?.name || 'Student').split(' ')[0];

  const totalExamsCount = useMemo(() => {
    const set = new Set();
    studentMarks.forEach(s => s.exams?.forEach(e => set.add(e.name)));
    return set.size;
  }, [studentMarks]);

  const avgScore = useMemo(() => {
    if (studentMarks.length === 0) return 0;
    let sum = 0, count = 0;
    studentMarks.forEach(s => {
      if (s.exams?.[0]) { sum += s.exams[0].score; count++; }
    });
    return count > 0 ? sum / count : 0;
  }, [studentMarks]);

  const attRecords = (studentId ? attendance[studentId] : null) || [];
  const overallAtt = useMemo(() => {
    const total = attRecords.length;
    const present = attRecords.filter(r => r.status === 'present').length;
    const late = attRecords.filter(r => r.status === 'late').length;
    return { pct: total > 0 ? Math.round(((present + late) / total) * 100) : null };
  }, [attRecords]);

  const TrendIcon = ({ trend }) => {
    if (trend === 'up') return <View style={[styles.trendBadge, { backgroundColor: Colors.accentGreenLight }]}><Ionicons name="trending-up" size={14} color={Colors.accentGreen} /><Text style={{ fontSize: 12, fontWeight: '700', color: Colors.accentGreen }}>Up</Text></View>;
    if (trend === 'down') return <View style={[styles.trendBadge, { backgroundColor: Colors.accentRedLight }]}><Ionicons name="trending-down" size={14} color={Colors.accentRed} /><Text style={{ fontSize: 12, fontWeight: '700', color: Colors.accentRed }}>Down</Text></View>;
    return <View style={[styles.trendBadge, { backgroundColor: Colors.surface2 }]}><Ionicons name="remove" size={14} color={Colors.textMuted} /><Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textMuted }}>Stable</Text></View>;
  };

  return (
    <View style={styles.container}>
      <ChildSwitcher />
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loadingData} onRefresh={reloadData} tintColor={Colors.brand} />}>

      {/* Academic Overview */}
      <Card variant="lg" style={{ padding: 20, marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 6 }}>Academic Overview</Text>
        <Text style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: 20 }}>{firstName} is showing consistent performance across academic fields.</Text>
        <View style={styles.statsGrid}>
          {[
            { label: 'Average Score', value: studentMarks.length > 0 ? `${avgScore.toFixed(1)}%` : '—' },
            { label: 'Total Subjects', value: studentMarks.length.toString() },
            { label: 'Attendance', value: overallAtt.pct != null ? `${overallAtt.pct}%` : '—' },
            { label: 'Exams Taken', value: totalExamsCount.toString() },
          ].map(({ label, value }) => (
            <View key={label} style={styles.statBox}>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={styles.statValue}>{value}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Performance Banner */}
      <View style={styles.perfBanner}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.white, marginBottom: 4 }}>Performance Analytics</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Deep insights and comparative class metrics.</Text>
        </View>
      </View>

      {/* Subject-wise */}
      <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 14 }}>Subject-wise Performance</Text>
      {studentMarks.length === 0 ? (
        <Card style={{ padding: 20, marginBottom: 20 }}>
          <Text style={{ textAlign: 'center', color: Colors.textMuted, fontSize: 13 }}>No grades published yet</Text>
        </Card>
      ) : (
        studentMarks.map(s => {
          const examData = s.exams?.[0] || null;
          return (
            <Card key={s.subject} style={styles.subjectCard}>
              <View style={styles.subjectIcon}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.brand }}>Σ</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: Colors.text }}>{s.subject}</Text>
                <Text style={{ fontSize: 13, color: Colors.textMuted, marginTop: 2 }}>
                  {examData ? `${examData.name} Score:` : 'No marks entered'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.brand }}>
                  {examData ? `${examData.score}/${examData.max}` : '—'}
                </Text>
                <TrendIcon trend={s.trend} />
              </View>
            </Card>
          );
        })
      )}

      {/* Bar Chart - Simple implementation */}
      {studentMarks.length > 0 && studentMarks[0]?.exams?.length > 0 && (
        <Card style={{ padding: 20, marginTop: 10, marginBottom: 20 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: Colors.text, marginBottom: 16 }}>Grade Trend — {studentMarks[0].subject}</Text>
          <View style={styles.chartContainer}>
            {[...studentMarks[0].exams].reverse().map((e, i) => (
              <View key={i} style={styles.barWrap}>
                <Text style={styles.barValue}>{e.score}</Text>
                <View style={[styles.bar, { height: (e.score / (e.max || 100)) * 120, backgroundColor: Colors.brand }]} />
                <Text style={styles.barLabel} numberOfLines={1}>{e.name.split(' ').slice(0, 2).join(' ')}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { backgroundColor: Colors.surface2, borderRadius: Radius.lg, padding: 14, width: '48%' },
  statLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  perfBanner: { backgroundColor: Colors.brand, borderRadius: Radius['2xl'], padding: 20, marginBottom: 20, flexDirection: 'row', alignItems: 'center' },
  subjectCard: { padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 },
  subjectIcon: { width: 40, height: 40, backgroundColor: Colors.brandLight, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 160, paddingBottom: 24 },
  barWrap: { alignItems: 'center', flex: 1 },
  bar: { width: 28, borderTopLeftRadius: 6, borderTopRightRadius: 6, marginVertical: 4 },
  barValue: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  barLabel: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', width: 50 },
});
