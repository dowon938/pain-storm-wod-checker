import { WodItem } from '@/lib/schemas';
import { Image } from 'expo-image';
import {
  Image as RNImage,
  ScrollView,
  StyleSheet,
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
import { openImageViewer } from '@/hooks/useImageViewer';
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
  const scrollRef = React.useRef<ScrollView>(null);
  const perferBranch = useWatchPerferBranch();
  const isAllAtOnce = perferBranch === PerferBranch.ALL_AT_ONCE;

  const itemSpacing = 12;
  const horizontalPadding = 12;
  const cardWidth = width - horizontalPadding * 2;
  const pageWidth = cardWidth + itemSpacing;
  const didSetInitialScrollRef = React.useRef(false);

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
                onMomentumScrollEnd={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const idx = Math.round(x / pageWidth);
                  hapticLight();
                  setActiveIndex(idx);
                  const h = itemHeightsRef.current[idx] ?? 0;
                  activeItemHeight.value = withTiming(h, {
                    duration: 240,
                    easing: Easing.out(Easing.cubic),
                  });
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
