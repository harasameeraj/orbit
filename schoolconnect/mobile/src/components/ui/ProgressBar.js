import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../theme/colors';

export default function ProgressBar({ progress = 0, color = Colors.accentGreen, style }) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.fill, { width: `${clampedProgress}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 6,
    width: '100%',
    backgroundColor: Colors.border,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.sm,
  },
});
