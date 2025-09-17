import { WodItem } from '@/lib/schemas';
import { Image } from 'expo-image';
import {
  Image as RNImage,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

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
  React.useEffect(() => {
    if (!wodItem.imageUrl) return;
    RNImage.getSize(
      wodItem.imageUrl,
      (width, height) => {
        setImageRatio(width / height);
      },
      (error) => {
        console.error('이미지 로드 실패:', error);
      }
    );
  }, [wodItem.imageUrl]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden' }}
      onPress={() => {
        // router.push(
        //   `stack-webview?detailId=${group?.entries?.[0]?.link?.split(';')[1]}`
        // );
        // router.push(`/wod/${group.dateLabel}`);
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
            style={[styles.titleText, { bottom: 8, right: 16, opacity: 0.4 }]}
          >
            {EngNames[wodItem.wods[0].name as keyof typeof EngNames] ??
              wodItem.wods[0].name ??
              ''}
          </Text>
        </View>
        <View style={{ padding: 12 }}>
          <View style={{ gap: 8 }}>
            {wodItem.wods.map(
              (e, idx) =>
                idx === 0 && <WodCard key={`${e.name}-${idx}`} wod={e} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
