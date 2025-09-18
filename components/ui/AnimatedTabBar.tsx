import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const indicatorX = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const tabCount = state.routes.length;
  const tabWidthPercent = 100 / Math.max(tabCount, 1);

  const onTabPress = (index: number, routeKey: string, routeName: string) => {
    indicatorX.value = withTiming(index, { duration: 250 });
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(routeName as never);
    }
  };

  const containerBg = useMemo(() => 'white', []);

  useEffect(() => {
    // keep indicator in sync when route changes programmatically
    indicatorX.value = withTiming(state.index, { duration: 250 });
  }, [indicatorX, state.index]);

  const indicatorStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      indicatorX.value,
      [0, tabCount - 1],
      [0, containerWidth - containerWidth / Math.max(tabCount, 1)]
    );
    return {
      width: containerWidth / Math.max(tabCount, 1),
      transform: [{ translateX }],
    };
  }, [tabCount, containerWidth]);
  console.log(insets.bottom);
  const insetBottom = Platform.OS === 'ios' ? 24 : insets.bottom + 12;
  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: insetBottom,
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: containerBg,
          },
        ]}
        onLayout={onLayout}
      >
        <Animated.View style={[styles.indicator, indicatorStyle]} />
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const color = isFocused
            ? Colors[colorScheme ?? 'light'].tint
            : Colors[colorScheme ?? 'light'].tabIconDefault;

          return (
            <Pressable
              key={route.key}
              accessibilityRole='button'
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => onTabPress(index, route.key, route.name)}
              style={styles.tab}
            >
              {options.tabBarIcon
                ? options.tabBarIcon({ focused: isFocused, color, size: 28 })
                : null}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: isFocused ? 'white' : 'gray',
                }}
              >
                {typeof label === 'string' ? label : ''}
              </Text>
              {/* Hide text labels for a clean float style; could add Animated opacity if desired */}
            </Pressable>
          );
        })}
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 70,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    width: '92%',
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.2)',
    // elevation: 8,
    // shadowColor: '#000',
    // shadowOpacity: 0.1,
    // shadowRadius: 12,
    // shadowOffset: { width: 0, height: 4 },
    gap: 20,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'black',
    borderRadius: 24,
  },
});
