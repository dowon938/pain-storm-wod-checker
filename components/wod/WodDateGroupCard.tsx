import { WodItem } from '@/lib/schemas';
import { Image } from 'expo-image';
import {
  FlatList,
  Image as RNImage,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { useWatchPerferBranch } from '@/components/wod/BranchSelector';
import { hapticLight } from '@/hooks/haptic';
import { openImageViewer } from '@/hooks/useImageViewer';
import { debounce } from 'es-toolkit/compat';
import React from 'react';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { WodCard } from './WodCard';

type Props = {
  wodItem: WodItem;
};

const EngNames = {
  압구정: 'APGUJEONG.',
  잠실: 'JAMSIL.',
  수원: 'SUWON.',
  아차산: 'ACHASAN.',
  기타: 'ETC.',
};
const MIN_ITEM_HEIGHT = 165;

export function WodDateGroupCard({ wodItem }: Props) {
  const [imageRatio, setImageRatio] = React.useState(0);
  const { width } = useWindowDimensions();
  const flatListRef = React.useRef<FlatList<any>>(null);
  const perferBranch = useWatchPerferBranch();

  const itemSpacing = 12;
  const horizontalPadding = 12;
  const cardWidth = width - horizontalPadding * 2;

  const names = React.useMemo(
    () => wodItem.wods.map((w) => w.name),
    [wodItem.wods]
  );
  const initialIndex = React.useMemo(() => {
    const idx = names.findIndex((n) => n === perferBranch);
    return idx >= 0 ? idx : 0;
  }, [names, perferBranch]);
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);
  React.useEffect(() => {
    if (!wodItem.imageUrl) return;
    RNImage.getSize(
      wodItem.imageUrl,
      (width, height) => {
        setImageRatio(Math.max(width / height, 1.2));
      },
      (error) => {
        console.error('이미지 로드 실패:', error);
      }
    );
  }, [wodItem.imageUrl]);
  const itemHeightsRef = React.useRef<Record<number, number>>({});
  const activeItemHeight = useSharedValue(MIN_ITEM_HEIGHT);
  const heightAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: activeItemHeight.value
        ? activeItemHeight.value + 12 + 12
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
      flatListRef.current?.scrollToIndex({ index: idx, animated: true });
    }
  }, [perferBranch, names, activeItemHeight]);

  const debouncedSetActiveIndex = debounce((idx: number) => {
    setActiveIndex(idx);
  }, 300);

  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      const first = viewableItems.find((v) => v.index != null);
      if (first && typeof first.index === 'number') {
        // console.log('onViewableItemsChanged', first.index);
        hapticLight();
        debouncedSetActiveIndex(first.index);
        const h = itemHeightsRef.current[first.index] ?? 0;
        activeItemHeight.value = withTiming(h, {
          duration: 240,
          easing: Easing.out(Easing.cubic),
        });
      }
    }
  ).current;
  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  return (
    <View
      style={{
        backgroundColor: 'rgba(254, 250, 246, 0.95)',
        borderRadius: 24,
        overflow: 'hidden',
      }}
    >
      <View style={{ flex: 1 }}>
        <Animated.View
          entering={FadeIn}
          style={{
            width: '100%',
            height: imageRatio ? width / imageRatio - 20 : 68,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              style={{ flex: 1 }}
              onPress={() => {
                if (!wodItem.imageUrl) return;
                hapticLight();
                openImageViewer({
                  url: wodItem.imageUrl!,
                });
              }}
            >
              <Animated.View
                sharedTransitionTag={wodItem.imageUrl}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              >
                <Image
                  source={{ uri: wodItem.imageUrl }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#f3f4f6',
                  }}
                  contentFit='cover'
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
          <Text
            style={[
              styles.titleText,
              {
                top: 16,
                left: 16,
                opacity: 0.8,
                textShadowColor: 'rgba(0, 0, 0, 0.7)',
              },
            ]}
          >
            {wodItem.title.replace(' ', '\n')}
          </Text>
          <Text
            style={[styles.titleText, { bottom: 8, right: 16, opacity: 0.45 }]}
          >
            {EngNames[wodItem.wods[0].name as keyof typeof EngNames] ??
              wodItem.wods[0].name ??
              ''}
          </Text>
        </Animated.View>
        <View style={{ padding: 12, paddingBottom: 0 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {names.map((name, idx) => {
              const selected = idx === activeIndex;
              return (
                <TouchableOpacity
                  key={`${name}-${idx}`}
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveIndex(idx);
                    flatListRef.current?.scrollToIndex({
                      index: idx,
                      animated: true,
                    });
                  }}
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
                      fontSize: 12,
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
            <FlatList
              nestedScrollEnabled
              style={{ marginHorizontal: -12 }}
              ref={flatListRef}
              data={wodItem.wods}
              keyExtractor={(item, idx) => `${item.name}-${idx}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToAlignment='start'
              decelerationRate='fast'
              snapToInterval={cardWidth + itemSpacing}
              getItemLayout={(_, index) => ({
                length: cardWidth + itemSpacing,
                offset: (cardWidth + itemSpacing) * index,
                index,
              })}
              initialScrollIndex={initialIndex}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({
                    index: info.index,
                    animated: false,
                  });
                }, 0);
              }}
              contentContainerStyle={{
                paddingLeft: horizontalPadding,
                paddingRight: horizontalPadding,
              }}
              ItemSeparatorComponent={() => (
                <View style={{ width: itemSpacing }} />
              )}
              renderItem={({ item, index }) => (
                <View style={{ width: cardWidth }}>
                  <WodCard
                    wod={item}
                    itemHeightsRef={itemHeightsRef}
                    idx={index}
                  />
                </View>
              )}
              viewabilityConfig={viewabilityConfig}
              onViewableItemsChanged={onViewableItemsChanged}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleText: {
    fontSize: 24,
    position: 'absolute',
    color: 'rgba(255, 255, 255, 1)',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: 'Heavitas',
    opacity: 1,
  },
});
