import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../theme/colors';

const PRESETS = {
  brand: { bg: Colors.brandLight, color: Colors.brand },
  green: { bg: Colors.accentGreenLight, color: Colors.accentGreen },
  red: { bg: Colors.accentRedLight, color: Colors.accentRed },
  amber: { bg: Colors.accentAmberLight, color: Colors.accentAmber },
  muted: { bg: Colors.surface2, color: Colors.textMuted },
};

export default function Badge({ children, variant = 'brand', style }) {
  const preset = PRESETS[variant] || PRESETS.brand;
  return (
    <View style={[styles.base, { backgroundColor: preset.bg }, style]}>
      <Text style={[styles.text, { color: preset.color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
