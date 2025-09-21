import { WodItem } from '@/lib/schemas';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  PerferBranch,
  useWatchPerferBranch,
} from '@/components/wod/BranchSelector';
import { hapticLight } from '@/hooks/haptic';
import React from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import WodCard from './WodCard';
import WodImageCard from './WodImageCard';

type Props = {
  wodItem: WodItem;
};

const MIN_ITEM_HEIGHT = 165;

export function WodDateGroupCard({ wodItem }: Props) {
  const countRef = React.useRef(0);
  countRef.current++;
  console.log('WodDateGroupCard', countRef.current);
  const { width } = useWindowDimensions();
  const scrollRef = React.useRef<ScrollView>(null);
  const perferBranch = useWatchPerferBranch();
  const isAllAtOnce = perferBranch === PerferBranch.ALL_AT_ONCE;

  const itemSpacing = 12;
  const horizontalPadding = 12;
  const cardWidth = width - horizontalPadding * 2;
  const pageWidth = cardWidth + itemSpacing;
  const didSetInitialScrollRef = React.useRef(false);
  const lastHapticIndexRef = React.useRef<number | null>(null);

  const names = React.useMemo(
    () => wodItem.wods.map((w) => w.name),
    [wodItem.wods]
  );
  const initialIndex = React.useMemo(() => {
    const idx = names.findIndex((n) => n === perferBranch);
    return idx >= 0 ? idx : 0;
  }, [names, perferBranch]);
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);

  const itemHeightsRef = React.useRef<Record<number, number>>({});
  const activeItemHeight = useSharedValue(MIN_ITEM_HEIGHT);
  const heightAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: isAllAtOnce
        ? undefined
        : activeItemHeight.value
        ? activeItemHeight.value + 12 + 12 + 8
        : undefined,
    };
  });

  React.useEffect(() => {
    const idx = names.findIndex((n) => n === perferBranch);
    if (idx >= 0) {
      setActiveIndex(idx);
      if (itemHeightsRef.current[idx]) {
        //브랜치 설정바뀔때 withTiming 호출시 부하가 커서 제거
        activeItemHeight.value = itemHeightsRef.current[idx];
      }
      scrollRef.current?.scrollTo({ x: idx * pageWidth, y: 0, animated: true });
    }
  }, [perferBranch, names, activeItemHeight, pageWidth]);

  return (
    <View
      style={{
        backgroundColor: 'rgba(254, 250, 246, 0.95)',
        borderRadius: 32,
        overflow: 'hidden',
      }}
    >
      <View style={{ flex: 1 }}>
        <WodImageCard wodItem={wodItem} />
        <View style={{ padding: 12, paddingBottom: 0 }}>
          {isAllAtOnce ? null : (
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: -4 }}>
              {names.map((name, idx) => {
                const selected = idx === activeIndex;
                return (
                  <TouchableOpacity
                    key={`${name}-${idx}`}
                    activeOpacity={0.8}
                    onPress={() => {
                      hapticLight();
                      setActiveIndex(idx);
                      scrollRef.current?.scrollTo({
                        x: idx * pageWidth,
                        y: 0,
                        animated: true,
                      });
                    }}
                    hitSlop={4}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: selected ? 'black' : 'transparent',
                      borderWidth: 1,
                      borderColor: 'rgba(0,0,0,0.1)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: selected ? 'white' : '#111827',
                      }}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {isAllAtOnce ? (
            <View style={{ gap: 12, marginBottom: 12 }}>
              {wodItem.wods.map((item, index) => {
                return (
                  <View
                    key={`atonce-${item.name}-${index}`}
                    style={{ width: cardWidth }}
                  >
                    <WodCard
                      wod={item}
                      itemHeightsRef={itemHeightsRef}
                      idx={index}
                      isAllAtOnce={isAllAtOnce}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <Animated.View style={heightAnimatedStyle}>
              <ScrollView
                ref={scrollRef}
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                snapToAlignment='start'
                decelerationRate='fast'
                snapToInterval={pageWidth}
                style={{ marginHorizontal: -12 }}
                contentContainerStyle={{
                  paddingLeft: horizontalPadding,
                  paddingRight: horizontalPadding,
                }}
                onLayout={() => {
                  if (didSetInitialScrollRef.current) return;
                  didSetInitialScrollRef.current = true;
                  if (initialIndex > 0) {
                    const x = initialIndex * pageWidth;
                    scrollRef.current?.scrollTo({ x, y: 0, animated: false });
                  }
                }}
                onScroll={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const idx = Math.round(x / pageWidth);
                  if (
                    idx !== activeIndex &&
                    idx >= 0 &&
                    idx < wodItem.wods.length
                  ) {
                    setActiveIndex(idx);
                    const h = itemHeightsRef.current[idx] ?? 0;
                    activeItemHeight.value = withTiming(h, {
                      duration: 240,
                      easing: Easing.out(Easing.cubic),
                    });
                    if (lastHapticIndexRef.current !== idx) {
                      hapticLight();
                      lastHapticIndexRef.current = idx;
                    }
                  }
                }}
                scrollEventThrottle={16 * 3}
                onMomentumScrollEnd={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const idx = Math.round(x / pageWidth);
                  if (idx !== activeIndex) {
                    setActiveIndex(idx);
                    const h = itemHeightsRef.current[idx] ?? 0;
                    activeItemHeight.value = withTiming(h, {
                      duration: 240,
                      easing: Easing.out(Easing.cubic),
                    });
                  }
                }}
              >
                {wodItem.wods.map((item, index) => (
                  <View
                    key={`${item.name}-${index}`}
                    style={{
                      width: cardWidth,
                      marginRight:
                        index === wodItem.wods.length - 1 ? 0 : itemSpacing,
                    }}
                  >
                    <WodCard
                      wod={item}
                      itemHeightsRef={itemHeightsRef}
                      idx={index}
                    />
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          )}
          {isAllAtOnce ? null : (
            <View
              style={{
                flexDirection: 'row',
                gap: 6,
                alignSelf: 'center',
                position: 'absolute',
                bottom: 10,
              }}
            >
              {Array.from({ length: wodItem.wods.length }).map((_, index) => (
                <TouchableOpacity
                  key={`indicator-${index}`}
                  activeOpacity={0.8}
                  onPress={() => {
                    hapticLight();
                    setActiveIndex(index);
                    scrollRef.current?.scrollTo({
                      x: index * pageWidth,
                      y: 0,
                      animated: true,
                    });
                  }}
                  style={{
                    width: 12,
                    height: 5,
                    backgroundColor:
                      index === activeIndex
                        ? 'rgba(0,0,0,0.8)'
                        : 'rgba(255,255,255,1)',
                    // : 'transparent',
                    borderRadius: 10,
                    // borderWidth: 1,
                    // borderColor: 'rgba(0,0,0,0.1)',
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
