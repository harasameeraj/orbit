import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

export default function Avatar({ name, url, size = 40, style }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const fontSize = size * 0.38;

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      />
    );
  }

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Text style={[styles.text, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Colors.brand,
    fontWeight: '800',
  },
});
