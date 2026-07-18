import { Tabs } from 'expo-router';

import AnimatedTabBar from '@/components/ui/AnimatedTabBar';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
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
        name='record'
        options={{
          title: 'LOG',
          tabBarIcon: ({ focused }) => (
            <FontAwesome6
              name='ranking-star'
              size={14}
              color={!focused ? 'white' : 'black'}
              style={{ marginTop: 5 }}
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
          title: 'BOX',
          tabBarIcon: ({ focused }) => (
            <Octicons
              name='location'
              size={18}
              color={!focused ? 'white' : 'black'}
              style={{ marginTop: 2 }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
