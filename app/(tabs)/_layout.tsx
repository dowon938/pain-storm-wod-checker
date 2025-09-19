import { Tabs } from 'expo-router';
import React from 'react';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/HapticTab';
import AnimatedTabBar from '@/components/ui/AnimatedTabBar';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Octicons from '@expo/vector-icons/Octicons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  // const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarHideOnKeyboard: true,
        // We'll supply a custom tabBar; built-in style is not needed
        tabBarStyle: { display: 'none' },
      }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
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
        name='explore'
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
