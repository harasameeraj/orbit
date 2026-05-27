import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Shadows, Radius } from '../../theme/colors';

export default function Card({ children, style, variant = 'default', ...props }) {
  return (
    <View style={[styles.base, variant === 'lg' && styles.lg, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  lg: {
    borderRadius: Radius['2xl'],
    ...Shadows.md,
  },
});
