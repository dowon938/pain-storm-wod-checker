import { hapticLight } from '@/hooks/haptic';
import { useWatchWebImageViewerOpen } from '@/hooks/useImageViewer';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SPACE_INSIDE_CONTAINER = 5;
const BORDER_WIDTH = 0.5;

export default function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const indicatorX = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const webImageViewerOpen = (useWatchWebImageViewerOpen as unknown as () => boolean)();
  const translateY = useSharedValue(0);
  useEffect(() => {
    translateY.value = withTiming(webImageViewerOpen ? 120 : 0, { duration: 250 });
  }, [webImageViewerOpen, translateY]);
  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const tabCount = state.routes.length;

  const onTabPress = (index: number, routeKey: string, routeName: string) => {
    // Do not animate here; animation is handled by state.index effect to avoid double-anim
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    hapticLight();
    if (!event.defaultPrevented) {
      navigation.navigate(routeName as never);
    }
  };

  const didInitRef = useRef(false);
  useEffect(() => {
    // keep indicator in sync when route changes programmatically
    if (!didInitRef.current) {
      indicatorX.value = state.index; // set without animation on first mount
      didInitRef.current = true;
      return;
    }
    indicatorX.value = withSpring(state.index, {
      stiffness: 450,
      damping: 19,
      mass: 0.4,
    });
  }, [indicatorX, state.index]);

  const indicatorStyle = useAnimatedStyle(() => {
    const horizontalInset = SPACE_INSIDE_CONTAINER * 2 + BORDER_WIDTH * 2;
    const innerWidth = Math.max(containerWidth - horizontalInset, 0);
    const segmentWidth = tabCount > 0 ? innerWidth / tabCount : 0;
    const translateX = segmentWidth * indicatorX.value;
    return {
      width: segmentWidth,
      transform: [{ translateX }],
    };
  }, [tabCount, containerWidth]);
  const insetBottom = Platform.OS === 'ios' ? 24 : insets.bottom + 8;
  const wrapperAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          paddingBottom: insetBottom,
        },
        wrapperAnimatedStyle,
      ]}
    >
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.8)']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 90,
          opacity: 0.8,
        }}
      />
      <View style={styles.container} onLayout={onLayout}>
        <Animated.View style={[styles.indicator, indicatorStyle]} />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          return (
            <TabBarItem
              key={route.key}
              index={index}
              isFocused={state.index === index}
              options={options}
              label={typeof label === 'string' ? label : ''}
              onPress={() => onTabPress(index, route.key, route.name)}
              indicatorX={indicatorX}
              tabCount={tabCount}
            />
          );
        })}
      </View>
    </Animated.View>
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
    width: '85%',
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: BORDER_WIDTH,
    backgroundColor: 'black',
    // backgroundColor: '#1F1F1F',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  indicator: {
    position: 'absolute',
    top: SPACE_INSIDE_CONTAINER,
    bottom: SPACE_INSIDE_CONTAINER,
    left: SPACE_INSIDE_CONTAINER,
    backgroundColor: 'white',
    // backgroundColor: '#363636',
    borderRadius: 26,
  },
});

type TabBarItemProps = {
  index: number;
  isFocused: boolean;
  options: import('@react-navigation/bottom-tabs').BottomTabNavigationOptions;
  label: string;
  onPress: () => void;
  indicatorX: Animated.SharedValue<number>;
  tabCount: number;
};

const TabBarItem = React.memo(function TabBarItem({
  index,
  isFocused,
  options,
  label,
  onPress,
  indicatorX,
  tabCount,
}: TabBarItemProps) {
  const focusedOpacity = useAnimatedStyle(() => {
    const distance = Math.abs(indicatorX.value - index);
    const t = Math.max(0, Math.min(1, 1 - distance));
    return {
      opacity: withTiming(t, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      }),
    };
  }, [index]);

  const unfocusedOpacity = useAnimatedStyle(() => {
    const distance = Math.abs(indicatorX.value - index);
    const t = Math.max(0, Math.min(1, 1 - distance));
    return {
      opacity: withTiming(1 - t, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      }),
    };
  }, [index]);

  const focusedScale = useAnimatedStyle(() => {
    const distance = Math.abs(indicatorX.value - index);
    const t = Math.max(0, Math.min(1, 1 - distance));
    const scale = 0.96 + 0.08 * t; // 0.96 -> 1.04 (덜 과격)
    return {
      transform: [
        {
          scale: withTiming(scale, {
            duration: 180,
            easing: Easing.out(Easing.cubic),
          }),
        },
      ],
    };
  }, [index]);

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      style={styles.tab}
    >
      <View
        style={{
          width: 24,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {options.tabBarIcon ? (
          <>
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                focusedOpacity,
                focusedScale,
              ]}
            >
              {options.tabBarIcon({ focused: true, color: 'black', size: 28 })}
            </Animated.View>
            <Animated.View
              style={[StyleSheet.absoluteFillObject, unfocusedOpacity]}
            >
              {options.tabBarIcon({ focused: false, color: 'white', size: 28 })}
            </Animated.View>
          </>
        ) : null}
      </View>
      <View style={{ marginLeft: label === 'LOCATION' ? -8 : -6 }}>
        <Animated.Text
          style={[
            {
              fontSize: 11,
              marginTop: 2,
              fontFamily: 'Heavitas',
              color: 'black',
              lineHeight: 14,
              includeFontPadding: false as unknown as boolean,
              textAlignVertical: 'center' as unknown as 'auto',
            },
            focusedOpacity,
          ]}
        >
          {label}
        </Animated.Text>
        <Animated.Text
          style={[
            {
              fontSize: 11,
              marginTop: 2,
              fontFamily: 'Heavitas',
              color: 'white',
              position: 'absolute',
              left: 0,
              right: 0,
              lineHeight: 14,
              includeFontPadding: false as unknown as boolean,
              textAlignVertical: 'center' as unknown as 'auto',
            },
            unfocusedOpacity,
          ]}
        >
          {label}
        </Animated.Text>
      </View>
    </Pressable>
  );
});
