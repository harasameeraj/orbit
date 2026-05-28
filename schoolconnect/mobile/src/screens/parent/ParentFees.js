import React, { useState, useEffect } from 'react';
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
import { getStudentFees } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ChildSwitcher from '../../components/shared/ChildSwitcher';
import { Colors, Radius } from '../../theme/colors';

function fmt(n) {
  if (n == null) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const STATUS_META = {
  pending:  { label: 'Pending',  color: Colors.accentAmber, bg: Colors.accentAmberLight, icon: 'time-outline' },
  paid:     { label: 'Paid',     color: Colors.accentGreen, bg: Colors.accentGreenLight, icon: 'checkmark-circle-outline' },
  partial:  { label: 'Partial',  color: Colors.brand,        bg: Colors.brandLight,        icon: 'ellipse-outline' },
  overdue:  { label: 'Overdue',  color: Colors.accentRed,   bg: Colors.accentRedLight,   icon: 'alert-circle-outline' },
  waived:   { label: 'Waived',   color: Colors.textMuted,   bg: Colors.surface2,          icon: 'ban-outline' },
};

export default function ParentFees() {
  const { user } = useAuth();
  const { students, activeStudent, announcements, reloadData, loadingData } = useData();
  const student = activeStudent || students[0] || {};

  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feeError, setFeeError] = useState(null);
  const [showPayModal, setShowPayModal] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [payForm, setPayForm] = useState({ cardNo: '', expiry: '', cvv: '', upiId: '', mode: 'upi' });

  const fetchFees = async (studentId) => {
    if (!studentId) return;
    setLoading(true);
    setFeeError(null);
    try {
      const data = await getStudentFees(studentId);
      setFees(data || []);
    } catch (e) {
      console.warn('ParentFees fetchFees error:', e?.message);
      setFeeError('Failed to load fee records. Pull down to retry.');
    }
    setLoading(false);
  };

  useEffect(() => {
    // Use activeStudent?.id directly — it's a stable primitive that changes when child is switched
    fetchFees(activeStudent?.id || students[0]?.id);
  }, [activeStudent?.id, students[0]?.id]);

  const handleRefresh = async () => {
    await reloadData();
    await fetchFees(student.id);
  };

  // Filter fee announcements
  const feeAnnouncements = announcements.filter(ann => 
    ann.title?.toLowerCase().includes('fee') || 
    ann.body?.toLowerCase().includes('fee') || 
    ann.body?.toLowerCase().includes('pay')
  );

  // Calculations
  const totalBilled = fees.reduce((sum, f) => sum + Number(f.amount_due), 0);
  const totalPaid = fees.reduce((sum, f) => sum + Number(f.amount_paid), 0);
  const totalOutstanding = totalBilled - totalPaid;

  const handleSimulatePayment = (feeRecord) => {
    setShowPayModal(feeRecord);
  };

  const confirmPayment = () => {
    if (!showPayModal) return;
    // Simulate updating state locally
    const updatedFees = fees.map(f => {
      if (f.id === showPayModal.id) {
        return {
          ...f,
          amount_paid: f.amount_due,
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
          payment_mode: payForm.mode,
        };
      }
      return f;
    });
    setFees(updatedFees);
    setShowPayModal(null);
    setPayForm({ cardNo: '', expiry: '', cvv: '', upiId: '', mode: 'upi' });
    setSuccessMsg('Payment simulated successfully! State updated locally.');
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  return (
    <View style={styles.container}>
      <ChildSwitcher />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loadingData || loading} onRefresh={handleRefresh} tintColor={Colors.brand} />}
      >
        {successMsg ? (
          <View style={styles.successBanner}>
            <Ionicons name="sparkles" size={18} color={Colors.accentGreen} />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* Dues Summary Grid */}
        <View style={styles.grid}>
          {[
            { label: 'Total Billed', value: fmt(totalBilled), sub: 'Academic Year', color: Colors.brand, icon: 'wallet-outline' },
            { label: 'Total Paid', value: fmt(totalPaid), sub: 'Received so far', color: Colors.accentGreen, icon: 'checkmark-circle-outline' },
            { label: 'Outstanding', value: fmt(totalOutstanding), sub: 'Due immediately', color: totalOutstanding > 0 ? Colors.accentRed : Colors.textMuted, icon: 'time-outline' },
          ].map(({ label, value, sub, color, icon }) => (
            <Card key={label} style={[styles.gridCard, { borderTopWidth: 3, borderTopColor: color }]}>
              <View style={styles.gridCardHeader}>
                <Text style={styles.gridLabel}>{label}</Text>
                <Ionicons name={icon} size={16} color={color} />
              </View>
              <Text style={[styles.gridValue, { color }]}>{value}</Text>
              <Text style={styles.gridSub}>{sub}</Text>
            </Card>
          ))}
        </View>

        {/* Fee Schedule */}
        <Card style={styles.scheduleCard}>
          <Text style={styles.cardTitle}>Fee Schedule</Text>
          {loading ? (
            <LoadingSpinner fullScreen={false} />
          ) : fees.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No fee records found for this student.</Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {fees.map(f => {
                const meta = STATUS_META[f.status] || STATUS_META.pending;
                const balance = Number(f.amount_due) - Number(f.amount_paid);
                return (
                  <View key={f.id} style={styles.feeItem}>
                    <View style={styles.feeHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.feeName}>{f.fee_structures?.name || 'School Fee'}</Text>
                        <Text style={styles.feeFreq}>
                          {f.fee_structures?.frequency ? f.fee_structures.frequency.toUpperCase() : 'ONCE'}
                        </Text>
                      </View>
                      <Badge variant={f.status === 'paid' ? 'green' : f.status === 'overdue' ? 'red' : f.status === 'pending' ? 'amber' : 'brand'}>
                        {meta.label}
                      </Badge>
                    </View>

                    <View style={styles.feeDetails}>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>Due Date</Text>
                        <Text style={styles.detailVal}>{f.due_date}</Text>
                      </View>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>Billed</Text>
                        <Text style={styles.detailVal}>{fmt(f.amount_due)}</Text>
                      </View>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>Paid</Text>
                        <Text style={[styles.detailVal, { color: Colors.accentGreen }]}>{fmt(f.amount_paid)}</Text>
                      </View>
                    </View>

                    {balance > 0 && f.status !== 'waived' && (
                      <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => handleSimulatePayment(f)}
                      >
                        <Text style={styles.payBtnText}>Pay Balance ({fmt(balance)})</Text>
                        <Ionicons name="arrow-forward-outline" size={14} color={Colors.white} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* Announcements */}
        <Card style={styles.announcementsCard}>
          <Text style={styles.cardTitle}>Fee & Payment Announcements</Text>
          {feeAnnouncements.length === 0 ? (
            <Text style={styles.emptyText}>No fee announcements from administration.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {feeAnnouncements.map(ann => (
                <View key={ann.id} style={styles.annItem}>
                  <Text style={styles.annTitle}>{ann.title}</Text>
                  <Text style={styles.annBody}>{ann.body}</Text>
                  <Text style={styles.annDate}>
                    {new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Payment Simulation Modal */}
      <Modal
        visible={!!showPayModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPayModal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Payment Gateway Sim</Text>
                <Text style={styles.modalSubtitle}>Paying: {showPayModal?.fee_structures?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPayModal(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {showPayModal && (
              <ScrollView contentContainerStyle={styles.modalBody}>
                <View style={styles.amountBanner}>
                  <Text style={styles.amountLabel}>Amount to Pay:</Text>
                  <Text style={styles.amountVal}>
                    {fmt(Number(showPayModal.amount_due) - Number(showPayModal.amount_paid))}
                  </Text>
                </View>

                {/* Mode Toggles */}
                <Text style={styles.inputLabel}>Payment Mode</Text>
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[styles.modeBtn, payForm.mode === 'upi' && styles.modeBtnActive]}
                    onPress={() => setPayForm(p => ({ ...p, mode: 'upi' }))}
                  >
                    <Text style={[styles.modeBtnText, payForm.mode === 'upi' && styles.modeBtnTextActive]}>UPI ID</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeBtn, payForm.mode === 'card' && styles.modeBtnActive]}
                    onPress={() => setPayForm(p => ({ ...p, mode: 'card' }))}
                  >
                    <Text style={[styles.modeBtnText, payForm.mode === 'card' && styles.modeBtnTextActive]}>Card</Text>
                  </TouchableOpacity>
                </View>

                {payForm.mode === 'upi' ? (
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>UPI ID *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="username@upi"
                      placeholderTextColor={Colors.textMuted}
                      value={payForm.upiId}
                      onChangeText={text => setPayForm(p => ({ ...p, upiId: text }))}
                      autoCapitalize="none"
                    />
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    <View style={styles.formGroup}>
                      <Text style={styles.inputLabel}>Card Number *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="4111 2222 3333 4444"
                        placeholderTextColor={Colors.textMuted}
                        value={payForm.cardNo}
                        onChangeText={text => setPayForm(p => ({ ...p, cardNo: text }))}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.formGroupRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Expiry (MM/YY) *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="12/28"
                          placeholderTextColor={Colors.textMuted}
                          value={payForm.expiry}
                          onChangeText={text => setPayForm(p => ({ ...p, expiry: text }))}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>CVV *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="123"
                          placeholderTextColor={Colors.textMuted}
                          value={payForm.cvv}
                          onChangeText={text => setPayForm(p => ({ ...p, cvv: text }))}
                          secureTextEntry
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                )}

                <Button
                  variant="primary"
                  style={styles.submitBtn}
                  onPress={confirmPayment}
                >
                  Simulate Success Payment
                </Button>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { padding: 16, gap: 16 },
  successBanner: {
    backgroundColor: Colors.accentGreenLight,
    padding: 12,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successText: { color: Colors.accentGreen, fontWeight: '700', fontSize: 13, flex: 1 },
  grid: { flexDirection: 'row', gap: 10 },
  gridCard: { flex: 1, padding: 12 },
  gridCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  gridLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  gridValue: { fontSize: 16, fontWeight: '800' },
  gridSub: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  scheduleCard: { padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  feeItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  feeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  feeName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  feeFreq: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, marginTop: 2 },
  feeDetails: { flexDirection: 'row', backgroundColor: Colors.surface2, padding: 10, borderRadius: Radius.md, marginBottom: 10 },
  detailCol: { flex: 1, alignItems: 'center' },
  detailLabel: { fontSize: 9, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase' },
  detailVal: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 2 },
  payBtn: {
    backgroundColor: Colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    gap: 6,
  },
  payBtnText: { color: Colors.white, fontWeight: '700', fontSize: 12 },
  announcementsCard: { padding: 16 },
  annItem: {
    backgroundColor: Colors.surface2,
    padding: 12,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand,
  },
  annTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  annBody: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  annDate: { fontSize: 10, color: Colors.textMuted, marginTop: 8 },

  // Modal styling
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  modalSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  closeBtn: { padding: 4, backgroundColor: Colors.surface2, borderRadius: Radius.sm },
  modalBody: { padding: 20, gap: 16 },
  amountBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.brandLight,
    padding: 14,
    borderRadius: Radius.md,
  },
  amountLabel: { fontWeight: '700', color: Colors.brand, fontSize: 14 },
  amountVal: { fontWeight: '800', color: Colors.brand, fontSize: 14 },
  formGroup: { gap: 6 },
  formGroupRow: { flexDirection: 'row', gap: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
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
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: Colors.surface2,
  },
  modeBtnActive: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  modeBtnTextActive: { color: Colors.brand, fontWeight: '700' },
  submitBtn: { marginTop: 10, paddingVertical: 12 },
});
