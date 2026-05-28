import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

/**
 * NetworkBanner — lightweight offline detector that pings the Supabase
 * health endpoint. Shows a persistent banner when the device appears offline.
 *
 * Uses polling instead of @react-native-community/netinfo to avoid
 * adding an extra native dependency (keeps Expo Go compatibility).
 */
export default function NetworkBanner() {
  const [offline, setOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const intervalRef = useRef(null);

  const checkConnection = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      await fetch('https://ouljlevztweykjoxjhal.supabase.co/rest/v1/', {
        method: 'HEAD',
        signal: controller.signal,
        headers: { apikey: 'sb_publishable_aiAkLg0JpW7r7OQiVfprxg_LEhi_HrA' },
      });
      clearTimeout(timeout);
      setOffline(false);
    } catch (_e) {
      setOffline(true);
    }
  };

  useEffect(() => {
    // Initial check after a short delay (don't block startup)
    const initialTimer = setTimeout(checkConnection, 3000);

    // Poll every 15 seconds
    intervalRef.current = setInterval(checkConnection, 15000);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: offline ? 0 : -50,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [offline]);

  if (!offline) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <Ionicons name="cloud-offline-outline" size={16} color="#92400e" />
      <Text style={styles.text}>No internet connection — some features may be unavailable</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fef3c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 9999,
    borderBottomWidth: 1,
    borderBottomColor: '#fbbf24',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
});
