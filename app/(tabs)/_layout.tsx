import { Tabs } from 'expo-router';
import React from 'react';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AnimatedTabBar from '@/components/ui/AnimatedTabBar';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Octicons from '@expo/vector-icons/Octicons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'black',
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: { display: 'none' },
      }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tabs.Screen
        name='records'
        options={{
          title: 'RECORDS',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name='kettlebell'
              size={24}
              color={!focused ? 'white' : 'black'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='index'
        options={{
          title: 'WOD',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name='kettlebell'
              size={24}
              color={!focused ? 'white' : 'black'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='location'
        options={{
          title: 'LOCATION',
          tabBarIcon: ({ focused }) => (
            <Octicons
              name='location'
              size={20}
              color={!focused ? 'white' : 'black'}
              style={{ marginTop: 2 }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
