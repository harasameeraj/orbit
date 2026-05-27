import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../theme/colors';

const VARIANTS = {
  primary: { bg: Colors.brand, color: Colors.white, border: Colors.brand },
  ghost: { bg: 'transparent', color: Colors.textSecondary, border: Colors.border },
  outline: { bg: 'transparent', color: Colors.brand, border: Colors.brand },
  danger: { bg: Colors.accentRed, color: Colors.white, border: Colors.accentRed },
  success: { bg: Colors.accentGreen, color: Colors.white, border: Colors.accentGreen },
};

export default function Button({ children, variant = 'primary', size = 'md', onPress, disabled, loading, style, textStyle, icon }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const sizeStyle = size === 'lg' ? styles.lg : size === 'sm' ? styles.sm : styles.md;
  const textSize = size === 'lg' ? 16 : size === 'sm' ? 13 : 14;

  return (
    <TouchableOpacity
      style={[styles.base, sizeStyle, { backgroundColor: v.bg, borderColor: v.border }, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.color} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: v.color, fontSize: textSize }, textStyle]}>{children}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: 8,
  },
  sm: { paddingVertical: 8, paddingHorizontal: 14 },
  md: { paddingVertical: 12, paddingHorizontal: 20 },
  lg: { paddingVertical: 16, paddingHorizontal: 24 },
  text: { fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
