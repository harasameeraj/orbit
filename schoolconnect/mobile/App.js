import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import ParentNavigator from './src/navigation/ParentNavigator';
import TeacherNavigator from './src/navigation/TeacherNavigator';
import LoadingSpinner from './src/components/ui/LoadingSpinner';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from './src/theme/colors';

function RootNavigator() {
  const { user, profile, loading } = useAuth();

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
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
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
