import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SchoolCodeScreen from '../screens/auth/SchoolCodeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  const { storedSchool } = useAuth();

  // If school is already stored, skip straight to Login.
  // If not, start at SchoolCode so the user can find their school first.
  return (
    <Stack.Navigator
      initialRouteName={storedSchool ? 'Login' : 'SchoolCode'}
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="SchoolCode" component={SchoolCodeScreen} />
      <Stack.Screen name="Login"      component={LoginScreen}      />
    </Stack.Navigator>
  );
}
