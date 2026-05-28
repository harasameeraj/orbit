import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ParentDashboard from '../screens/parent/ParentDashboard';
import ParentAttendance from '../screens/parent/ParentAttendance';
import ParentMarks from '../screens/parent/ParentMarks';
import ParentHomework from '../screens/parent/ParentHomework';
import ParentChat from '../screens/parent/ParentChat';
import ParentFees from '../screens/parent/ParentFees';
import ParentProfile from '../screens/parent/ParentProfile';
import { Colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

export default function ParentNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Attendance') {
            iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          } else if (route.name === 'Marks') {
            iconName = focused ? 'ribbon' : 'ribbon-outline';
          } else if (route.name === 'Homework') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Fees') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size - 2} color={color} />;
        },
        tabBarActiveTintColor: Colors.brand,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
        },
        tabBarItemStyle: {
          paddingBottom: 4,
        },
        headerStyle: {
          backgroundColor: Colors.white,
          borderBottomColor: Colors.border,
          borderBottomWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 16,
          color: Colors.text,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={ParentDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="Attendance" component={ParentAttendance} options={{ title: 'Attendance' }} />
      <Tab.Screen name="Marks" component={ParentMarks} options={{ title: 'Marks' }} />
      <Tab.Screen name="Homework" component={ParentHomework} options={{ title: 'Homework' }} />
      <Tab.Screen name="Chat" component={ParentChat} options={{ title: 'Messages' }} />
      <Tab.Screen name="Fees" component={ParentFees} options={{ title: 'Fees' }} />
      <Tab.Screen name="Profile" component={ParentProfile} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
