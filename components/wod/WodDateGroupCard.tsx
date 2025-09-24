import { WodItem } from '@/lib/schemas';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
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

const MIN_ITEM_HEIGHT = 165;
const ITEM_SPACING = 12;
const HORIZONTAL_PADDING = 12;

type AllAtOnceContentProps = {
  wodItem: WodItem;
  cardWidth: number;
};

function AllAtOnceContent({ wodItem, cardWidth }: AllAtOnceContentProps) {
  return (
    <View style={{ gap: 12, marginBottom: 12 }}>
      {wodItem.wods.map((item, index) => {
        return (
          <View
            key={`atonce-${item.name}-${index}`}
            style={{ width: cardWidth }}
          >
            <WodCard wod={item} idx={index} isAllAtOnce />
          </View>
        );
      })}
    </View>
  );
}

type PagedContentProps = {
  wodItem: WodItem;
  cardWidth: number;
  pageWidth: number;
  perferBranch: string;
  visibleIdsRef?: React.RefObject<Set<string>>;
};

function PagedContent({
  wodItem,
  cardWidth,
  pageWidth,
  perferBranch,
  visibleIdsRef,
}: PagedContentProps) {
  const scrollRef = React.useRef<ScrollView>(null);
  const didSetInitialScrollRef = React.useRef(false);
  const lastHapticIndexRef = React.useRef<number | null>(null);
  const itemHeightsRef = React.useRef<Record<number, number>>({});
  const [itemHeightsLoading, setItemHeightsLoading] = React.useState(true);

  const names = React.useMemo(
    () => wodItem.wods.map((w) => w.name),
    [wodItem.wods]
  );
  const initialIndex = React.useMemo(() => {
    const idx = names.findIndex((n) => n === perferBranch);
    return idx >= 0 ? idx : 0;
  }, [names, perferBranch]);
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);

  const activeItemHeight = useSharedValue(MIN_ITEM_HEIGHT);
  const heightAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: activeItemHeight.value
        ? activeItemHeight.value + 12 + 12 + 8
        : undefined,
    };
  });

  React.useEffect(() => {
    if (!didSetInitialScrollRef.current) return;
    const idx = names.findIndex((n) => n === perferBranch);
    if (idx >= 0) {
      if (itemHeightsRef.current[idx]) {
        activeItemHeight.value = itemHeightsRef.current[idx];
      }
      scrollRef.current?.scrollTo({
        x: idx * pageWidth,
        y: 0,
        animated: visibleIdsRef?.current?.has(wodItem.id) ?? false,
      });
    }
  }, [
    perferBranch,
    names,
    activeItemHeight,
    pageWidth,
    itemHeightsRef,
    visibleIdsRef,
    wodItem.id,
  ]);

  const setAnimationValueByPlatform = (h: number) => {
    if (Platform.OS === 'ios') {
      return withTiming(h, { duration: 240, easing: Easing.out(Easing.cubic) });
    }
    return h;
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / pageWidth);
    if (
      idx !== activeIndex &&
      idx >= 0 &&
      idx < wodItem.wods.length &&
      lastHapticIndexRef.current !== idx
    ) {
      setActiveIndex(idx);
      const h = itemHeightsRef.current[idx] ?? 0;
      Platform.OS === 'ios' && hapticLight();
      lastHapticIndexRef.current = idx;
      activeItemHeight.value = setAnimationValueByPlatform(h);
    }
  };

  React.useEffect(() => {
    if (!itemHeightsLoading) return;
    if (didSetInitialScrollRef.current) return;
    didSetInitialScrollRef.current = true;
    setActiveIndex(initialIndex);
    const x = initialIndex * pageWidth;
    scrollRef.current?.scrollTo({ x, y: 0, animated: false });
    setTimeout(() => {
      activeItemHeight.value = setAnimationValueByPlatform(
        itemHeightsRef.current[initialIndex] ?? 0
      );
    }, 250);
  }, [activeItemHeight, initialIndex, itemHeightsLoading, pageWidth]);

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: -4 }}>
        {names.map((name, idx) => {
          const selected = idx === activeIndex;
          return (
            <TouchableOpacity
              key={`${name}-${idx}`}
              activeOpacity={0.8}
              onPress={() => {
                hapticLight();
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
          contentContainerStyle={{ paddingHorizontal: HORIZONTAL_PADDING }}
          onScroll={onScroll}
          scrollEventThrottle={1000 / 5}
          onMomentumScrollEnd={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            const idx = Math.round(x / pageWidth);
            if (idx !== activeIndex) {
              setActiveIndex(idx);
              const h = itemHeightsRef.current[idx] ?? 0;
              activeItemHeight.value = setAnimationValueByPlatform(h);
            }
          }}
        >
          {wodItem.wods.map((item, index) => (
            <View
              key={`${item.name}-${index}`}
              style={{
                width: cardWidth,
                marginRight:
                  index === wodItem.wods.length - 1 ? 0 : ITEM_SPACING,
              }}
            >
              <WodCard
                wod={item}
                idx={index}
                wodsLength={wodItem.wods.length}
                itemHeightsRef={itemHeightsRef}
                setItemHeightsLoading={setItemHeightsLoading}
              />
            </View>
          ))}
        </ScrollView>
      </Animated.View>
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
            hitSlop={{ top: 10, bottom: 10, left: 3, right: 3 }}
            onPress={() => {
              hapticLight();
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
              borderRadius: 10,
            }}
          />
        ))}
      </View>
    </>
  );
}

type Props = {
  wodItem: WodItem;
  visibleIdsRef?: React.RefObject<Set<string>>;
};

function WodDateGroupCard({ wodItem, visibleIdsRef }: Props) {
  const countRef = React.useRef(0);
  countRef.current++;
  console.log('WodDateGroupCard', countRef.current);
  const { width } = useWindowDimensions();
  const perferBranch = useWatchPerferBranch();
  const isAllAtOnce = perferBranch === PerferBranch.ALL_AT_ONCE;

  const cardWidth = width - HORIZONTAL_PADDING * 2;
  const pageWidth = cardWidth + ITEM_SPACING;

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
          {isAllAtOnce ? (
            <AllAtOnceContent wodItem={wodItem} cardWidth={cardWidth} />
          ) : (
            <PagedContent
              wodItem={wodItem}
              cardWidth={cardWidth}
              pageWidth={pageWidth}
              perferBranch={perferBranch}
              visibleIdsRef={visibleIdsRef}
            />
          )}
        </View>
      </View>
    </View>
  );
}

export default React.memo(WodDateGroupCard);
