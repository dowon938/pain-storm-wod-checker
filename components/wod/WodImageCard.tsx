import { Image } from 'expo-image';
import React, { memo } from 'react';
import {
  Image as RNImage,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';

import { hapticLight } from '@/hooks/haptic';
import { openImageViewer } from '@/hooks/useImageViewer';
import { WodItem } from '@/lib/schemas';
import Animated, { FadeIn } from 'react-native-reanimated';

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

const styles = StyleSheet.create({
  titleText: {
    fontSize: 24,
    position: 'absolute',
    color: 'rgba(255, 255, 255, 1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: 'Heavitas',
  },
  topTitleText: {
    top: 16,
    left: 16,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
  },
  bottomTitleText: {
    bottom: 8,
    right: 16,
    opacity: 0.45,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
  },
  image: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
});

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const WodImageCard = ({ wodItem }: Props) => {
  const [imageRatio, setImageRatio] = React.useState(0);
  const { width } = useWindowDimensions();

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
  const openImage = React.useCallback(() => {
    if (!wodItem.imageUrl) return;
    hapticLight();
    openImageViewer({
      url: wodItem.imageUrl!,
    });
  }, [wodItem.imageUrl]);

  return (
    <AnimatedTouchableOpacity
      entering={FadeIn}
      activeOpacity={0.9}
      style={styles.container}
      onPress={openImage}
    >
      <Image
        source={{ uri: wodItem.imageUrl }}
        style={[
          styles.image,
          { height: imageRatio ? width / imageRatio - 20 : 68 },
        ]}
        contentFit='cover'
      />
      <Text style={[styles.titleText, styles.topTitleText]}>
        {wodItem.title.replace(' ', '\n')}
      </Text>
      <Text style={[styles.titleText, styles.bottomTitleText]}>
        {EngNames[wodItem.wods[0].name as keyof typeof EngNames] ??
          wodItem.wods[0].name ??
          ''}
      </Text>
    </AnimatedTouchableOpacity>
  );
};

export default memo(WodImageCard);
