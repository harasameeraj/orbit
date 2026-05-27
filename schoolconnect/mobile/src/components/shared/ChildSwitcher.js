import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useData } from '../../context/DataContext';
import { Colors, Radius } from '../../theme/colors';

export default function ChildSwitcher() {
  const { students, activeStudent, switchStudent, switchingChild } = useData();

  if (!students || students.length <= 1) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.viewingText}>Viewing:</Text>
      <View style={styles.list}>
        {students.map(s => {
          const isActive = s.id === activeStudent?.id;
          const initial = (s.name || '?')[0].toUpperCase();
          const firstName = s.name?.split(' ')[0] || 'Child';

          return (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.btn,
                isActive ? styles.btnActive : styles.btnInactive,
              ]}
              onPress={() => switchStudent(s)}
              disabled={switchingChild}
            >
              <View style={[
                styles.avatarCircle,
                isActive ? styles.avatarActive : styles.avatarInactive,
              ]}>
                <Text style={[
                  styles.avatarText,
                  isActive ? styles.avatarTextActive : styles.avatarTextInactive,
                ]}>{initial}</Text>
              </View>
              <Text style={[
                styles.btnLabel,
                isActive ? styles.btnLabelActive : styles.btnLabelInactive,
              ]}>
                {firstName}
                {s.classes?.name && ` (${s.classes.name})`}
              </Text>
            </TouchableOpacity>
          );
        })}
        {switchingChild && (
          <ActivityIndicator size="small" color={Colors.textMuted} style={{ marginLeft: 8 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  viewingText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginRight: 8,
  },
  list: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 2,
    gap: 6,
  },
  btnActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  btnInactive: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  avatarCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  avatarInactive: {
    backgroundColor: Colors.brandLight,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '800',
  },
  avatarTextActive: {
    color: Colors.white,
  },
  avatarTextInactive: {
    color: Colors.brand,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  btnLabelActive: {
    color: Colors.white,
  },
  btnLabelInactive: {
    color: Colors.text,
  },
});
