// app/(tabs)/_layout.tsx

import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, Platform } from 'react-native';

export default function TabLayout() {
  const { role, loading } = useAuth();

  // 🔄 Loading state
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const isOwner = role === 'owner';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 25 : 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      {/* 🔧 JOBS */}
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />

      {/* ➕ CREATE JOB */}
      <Tabs.Screen
        name="create-job"
        options={{
          title: 'New Job',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />

      {/* 📊 DASHBOARD (OWNER ONLY) */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Stats',
          href: isOwner ? undefined : null, // 🔥 safe hide
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />

      {/* ⚙️ MANAGE (OWNER ONLY) */}
      <Tabs.Screen
        name="manage"
        options={{
          title: 'Manage',
          href: isOwner ? undefined : null, // 🔥 safe hide
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}