import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import TeacherDashboard from '../screens/teacher/TeacherDashboard';
import TeacherAttendance from '../screens/teacher/TeacherAttendance';
import TeacherMarks from '../screens/teacher/TeacherMarks';
import TeacherStudents from '../screens/teacher/TeacherStudents';
import TeacherChat from '../screens/teacher/TeacherChat';
import TeacherProfile from '../screens/teacher/TeacherProfile';
import { Colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

export default function TeacherNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Attendance') {
            iconName = focused ? 'checkbox' : 'checkbox-outline';
          } else if (route.name === 'Marks') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'Students') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
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
      <Tab.Screen name="Dashboard" component={TeacherDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="Attendance" component={TeacherAttendance} options={{ title: 'Attendance' }} />
      <Tab.Screen name="Marks" component={TeacherMarks} options={{ title: 'Marks' }} />
      <Tab.Screen name="Students" component={TeacherStudents} options={{ title: 'Students' }} />
      <Tab.Screen name="Chat" component={TeacherChat} options={{ title: 'Messages' }} />
      <Tab.Screen name="Profile" component={TeacherProfile} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
