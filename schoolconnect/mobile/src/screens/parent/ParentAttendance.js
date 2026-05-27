import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import ChildSwitcher from '../../components/shared/ChildSwitcher';
import { Colors, Radius } from '../../theme/colors';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_META = {
  present: { color: Colors.accentGreen, bg: Colors.accentGreenLight, dot: '#22c55e', label: 'Present', icon: 'checkmark-circle' },
  absent:  { color: Colors.accentRed, bg: Colors.accentRedLight, dot: '#ef4444', label: 'Absent', icon: 'close-circle' },
  late:    { color: Colors.accentAmber, bg: Colors.accentAmberLight, dot: '#f59e0b', label: 'Late', icon: 'time' },
};

export default function ParentAttendance() {
  const { attendance, students, activeStudent, reloadData, loadingData } = useData();
  const student = activeStudent || students?.[0];
  const studentId = student?.id;
  const records = (studentId ? attendance[studentId] : null) || [];

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const statusMap = useMemo(() => {
    const map = {};
    records.forEach(r => { if (r.date) map[r.date] = r; });
    return map;
  }, [records]);

  const getRecord = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return statusMap[dateStr] || null;
  };

  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    const monthRecs = records.filter(r => r.date?.startsWith(prefix));
    return {
      present: monthRecs.filter(r => r.status === 'present').length,
      absent: monthRecs.filter(r => r.status === 'absent').length,
      late: monthRecs.filter(r => r.status === 'late').length,
      total: monthRecs.length,
    };
  }, [records, month, year]);

  const pct = monthStats.total > 0 ? Math.round(((monthStats.present + monthStats.late) / monthStats.total) * 100) : null;

  const overallStats = useMemo(() => {
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const late = records.filter(r => r.status === 'late').length;
    return { total, present, late, pct: total > 0 ? Math.round(((present + late) / total) * 100) : null };
  }, [records]);

  const recentRecs = [...records].sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 8);

  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isFuture = (day) => { const d = new Date(year, month, day); d.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); return d > t; };
  const isWeekend = (day) => { const dow = new Date(year, month, day).getDay(); return dow === 0 || dow === 6; };

  return (
    <View style={styles.container}>
      <ChildSwitcher />
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loadingData} onRefresh={reloadData} tintColor={Colors.brand} />}>

      {/* Student info */}
      {student && (
        <Card style={styles.studentCard}>
          <Avatar name={student.name} url={student.photo_url} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 18, color: Colors.text }}>{student.name}</Text>
            <Text style={{ fontSize: 13, color: Colors.textMuted }}>{student.classes?.name || ''} • Roll No. {student.roll_no}</Text>
          </View>
          {overallStats.pct != null && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 28, fontWeight: '900', color: overallStats.pct >= 75 ? Colors.accentGreen : Colors.accentRed }}>{overallStats.pct}%</Text>
              <Text style={{ fontSize: 11, color: Colors.textMuted, fontWeight: '600' }}>OVERALL</Text>
            </View>
          )}
        </Card>
      )}

      {/* Monthly Summary */}
      <View style={styles.summaryBanner}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>{MONTHS[month]} {year} — Summary</Text>
        {pct != null ? (
          <>
            <Text style={{ fontSize: 48, fontWeight: '900', color: Colors.white, lineHeight: 52 }}>{pct}%</Text>
            <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
          </>
        ) : (
          <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>No attendance data for this month yet</Text>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[['Present', monthStats.present, '#22c55e'], ['Absent', monthStats.absent, '#ef4444'], ['Late', monthStats.late, '#f59e0b'], ['Recorded', monthStats.total, '#fff']].map(([label, val, clr]) => (
            <View key={label}>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', marginTop: 2, color: clr }}>{val}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Calendar */}
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <View style={styles.calNav}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: Colors.text }}>{MONTHS[month]} {year}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.calBtn} onPress={prevMonth}><Ionicons name="chevron-back" size={16} color={Colors.text} /></TouchableOpacity>
            <TouchableOpacity style={[styles.calBtn, { backgroundColor: Colors.brandLight, paddingHorizontal: 12 }]} onPress={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.brand }}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.calBtn} onPress={nextMonth}><Ionicons name="chevron-forward" size={16} color={Colors.text} /></TouchableOpacity>
          </View>
        </View>

        {/* Day headers */}
        <View style={styles.calRow}>
          {DAYS_SHORT.map(d => (
            <View key={d} style={styles.calCell}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: (d === 'Sun' || d === 'Sat') ? Colors.accentRed : Colors.textMuted }}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calGrid}>
          {Array(firstDayOfWeek).fill(null).map((_, i) => <View key={`e${i}`} style={styles.calCell} />)}
          {Array(daysInMonth).fill(null).map((_, i) => {
            const day = i + 1;
            const rec = getRecord(day);
            const status = rec?.status;
            const meta = status ? STATUS_META[status] : null;
            const todayFlag = isToday(day);
            const futureFlag = isFuture(day);
            const weekendFlag = isWeekend(day);

            return (
              <View key={day} style={[styles.calCell, styles.calDay, {
                backgroundColor: todayFlag ? Colors.brand : meta ? meta.bg : weekendFlag ? Colors.surface2 : 'transparent',
                borderColor: todayFlag ? Colors.brand : Colors.border,
                opacity: futureFlag ? 0.35 : 1,
              }]}>
                <Text style={{ fontSize: 13, fontWeight: todayFlag ? '900' : '600', color: todayFlag ? Colors.white : weekendFlag && !meta ? Colors.textMuted : Colors.text }}>{day}</Text>
                {status && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: todayFlag ? 'rgba(255,255,255,0.8)' : meta.dot, position: 'absolute', bottom: 3 }} />}
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: meta.dot }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.textSecondary }}>{meta.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Recent Activity */}
      {recentRecs.length > 0 && (
        <Card style={{ padding: 20, marginBottom: 20 }}>
          <Text style={{ fontWeight: '700', marginBottom: 16, fontSize: 16, color: Colors.text }}>Recent Activity</Text>
          {recentRecs.map((rec, i) => {
            const meta = STATUS_META[rec.status] || STATUS_META.present;
            const label = new Date(rec.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <View key={i} style={[styles.recentRow, i < recentRecs.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.border }]}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: Colors.text }}>{label}</Text>
                  <Text style={{ fontSize: 12, color: Colors.textMuted }}>{rec.status === 'present' ? 'Present' : rec.status === 'late' ? 'Late arrival' : 'Absent'}</Text>
                </View>
                <View style={[styles.recentBadge, { backgroundColor: meta.bg }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: meta.color }}>{meta.label}</Text>
                </View>
              </View>
            );
          })}
        </Card>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  studentCard: { padding: 20, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  summaryBanner: { backgroundColor: Colors.brand, borderRadius: Radius['2xl'], padding: 24, marginBottom: 20 },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, marginVertical: 12 },
  progressFill: { height: 6, backgroundColor: Colors.white, borderRadius: 3 },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  calBtn: { backgroundColor: Colors.surface2, borderRadius: 8, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  calRow: { flexDirection: 'row', marginBottom: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calDay: { borderRadius: 10, borderWidth: 1 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  recentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
});
