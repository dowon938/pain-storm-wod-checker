import { WodItem } from '@/lib/schemas';
import { Image } from 'expo-image';
import {
  Image as RNImage,
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
      style={{ backgroundColor: 'white', borderRadius: 8, overflow: 'hidden' }}
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
            height: imageRatio ? width / imageRatio - 20 : 44,
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
            style={{
              fontSize: 24,
              fontWeight: '900',
              position: 'absolute',
              bottom: 8,
              right: 16,
              color: 'rgba(255, 255, 255, 1)',
              textShadowColor: 'rgba(0, 0, 0, 0.4)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {wodItem.wods[0].name}
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '900',
              position: 'absolute',
              bottom: 8,
              left: 16,
              right: 16,
              color: 'rgba(255, 255, 255, 1)',
              textShadowColor: 'rgba(0, 0, 0, 0.4)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {wodItem.title}
          </Text>
        </View>
        <View style={{ padding: 12 }}>
          <View style={{ gap: 8 }}>
            {wodItem.wods.map((e, idx) => (
              <WodCard key={`${e.name}-${idx}`} wod={e} />
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
