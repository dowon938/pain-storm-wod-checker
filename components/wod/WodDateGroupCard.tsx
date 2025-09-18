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
import { debounce } from 'es-toolkit/compat';
import React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { WodCard } from './WodCard';

type Props = {
  wodItem: WodItem;
};

const AnimatedImage = Animated.createAnimatedComponent(Image);

const EngNames = {
  압구정: 'APGUJEONG.',
  잠실: 'JAMSIL.',
  수원: 'SUWON.',
  아차산: 'ACHASAN.',
  기타: 'ETC.',
};

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

  React.useEffect(() => {
    const idx = names.findIndex((n) => n === perferBranch);
    if (idx >= 0) {
      setActiveIndex(idx);
      flatListRef.current?.scrollToIndex({ index: idx, animated: true });
    }
  }, [perferBranch, names]);

  const debouncedSetActiveIndex = debounce((idx: number) => {
    console.log('setActiveIndex');
    setActiveIndex(idx);
  }, 300);

  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      const first = viewableItems.find((v) => v.index != null);
      if (first && typeof first.index === 'number') {
        console.log('onViewableItemsChanged', first.index);
        debouncedSetActiveIndex(first.index);
      }
    }
  ).current;
  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  return (
    <View
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            width: '100%',
            height: imageRatio ? width / imageRatio - 20 : 68,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }}
        >
          <AnimatedImage
            entering={FadeIn}
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
            transition={150}
          />
          <Text
            style={[
              styles.titleText,
              {
                top: 12,
                left: 16,
                opacity: 0.7,
                textShadowColor: 'rgba(0, 0, 0, 0.5)',
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
        </View>
        <View style={{ padding: 12 }}>
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
                    borderWidth: selected ? 0 : 1,
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
            renderItem={({ item }) => (
              <View style={{ width: cardWidth }}>
                <WodCard wod={item} />
              </View>
            )}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleText: {
    fontSize: 24,
    fontWeight: '900',
    position: 'absolute',
    color: 'rgba(255, 255, 255, 1)',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: 'Heavitas',
    opacity: 1,
  },
});
