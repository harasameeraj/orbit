import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import ParentNavigator from './src/navigation/ParentNavigator';
import TeacherNavigator from './src/navigation/TeacherNavigator';
import LoadingSpinner from './src/components/ui/LoadingSpinner';
import ErrorBoundary from './src/components/shared/ErrorBoundary';
import NetworkBanner from './src/components/shared/NetworkBanner';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from './src/theme/colors';
import { saveFcmToken } from './src/lib/supabase';

// ─── Safe notification setup ─────────────────────────────────────────────────
// expo-notifications crashes in Expo Go on Android (SDK 53+).
// We lazy-import it and wrap all calls in try/catch.
let Notifications = null;
let Device = null;

const isExpoGo = Constants.appOwnership === 'expo';

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');

  // Show notifications even when app is in foreground
  // Only set the handler if we're NOT in Expo Go on Android
  if (Notifications && !isExpoGo) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (e) {
  console.warn('expo-notifications not available:', e?.message);
}

async function registerPushToken(userId) {
  try {
    // Skip push token registration in Expo Go (not supported on Android SDK 53+)
    if (isExpoGo) {
      console.log('Push notifications are not available in Expo Go. Use a development build for full notification support.');
      return;
    }
    if (!Notifications || !Device) return;
    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    await saveFcmToken(userId, tokenData.data);
    console.log('Push token registered:', tokenData.data);
  } catch (e) {
    // Non-critical — app works without notifications
    console.warn('Push token registration failed:', e?.message);
  }
}

function RootNavigator() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (user?.id) {
      registerPushToken(user.id);
    }
  }, [user?.id]);

  if (loading) {
    return <LoadingSpinner fullScreen={true} color={Colors.brand} />;
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthNavigator />
      ) : profile?.role === 'parent' ? (
        <DataProvider>
          <ParentNavigator />
        </DataProvider>
      ) : profile?.role === 'teacher' ? (
        <DataProvider>
          <TeacherNavigator />
        </DataProvider>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid role assigned. Contact admin.</Text>
        </View>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <NetworkBanner />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.accentRed,
    fontWeight: '700',
    textAlign: 'center',
  },
});
