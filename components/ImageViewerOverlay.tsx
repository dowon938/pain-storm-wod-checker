import {
  closeImageViewer,
  useWatchImageUrl,
  useWatchVisible,
} from '@/hooks/useImageViewer';
import { Image } from 'expo-image';
import React from 'react';
import { Modal, Image as RNImage, Text, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureUpdateEvent,
  PanGestureHandlerEventPayload,
  PinchGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export default function ImageViewerOverlay() {
  const visible = useWatchVisible();
  const url = (useWatchImageUrl as unknown as () => string | undefined)();

  const [saveDone] = React.useState<'ok' | 'fail' | undefined>();

  const onDismiss = () => {
    closeImageViewer();
  };

  // Save action removed for now; header UI is commented out.

  const scale = useSharedValue(1);
  const baseScale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const containerWidth = useSharedValue(0);
  const containerHeight = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const imageNaturalWidth = useSharedValue(0);
  const imageNaturalHeight = useSharedValue(0);
  const MAX_SCALE = 3;
  const MIN_SCALE = 1;

  React.useEffect(() => {
    if (!url) return;
    RNImage.getSize(
      url,
      (w, h) => {
        imageNaturalWidth.value = w;
        imageNaturalHeight.value = h;
      },
      () => {
        imageNaturalWidth.value = 0;
        imageNaturalHeight.value = 0;
      }
    );
  }, [url, imageNaturalWidth, imageNaturalHeight]);

  const pinchGesture = Gesture.Pinch()
    .onStart((event: GestureUpdateEvent<PinchGestureHandlerEventPayload>) => {
      baseScale.value = scale.value;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    })
    .onChange((event: GestureUpdateEvent<PinchGestureHandlerEventPayload>) => {
      focalX.value = event.focalX;
      focalY.value = event.focalY;
      // Combine existing scale with the current gesture delta
      const next = baseScale.value * event.scale;
      scale.value = next;
    })
    .onEnd(() => {
      const targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.value));
      scale.value = withSpring(targetScale, {
        damping: 15,
        stiffness: 100,
        restDisplacementThreshold: 0.0001,
      });

      // Clamp translation to bounds for the resulting scale
      const cw = containerWidth.value;
      const ch = containerHeight.value;
      const iw = imageNaturalWidth.value;
      const ih = imageNaturalHeight.value;
      if (cw > 0 && ch > 0 && iw > 0 && ih > 0) {
        const fit = Math.min(cw / iw, ch / ih);
        const displayW = iw * fit;
        const displayH = ih * fit;
        const scaledW = displayW * targetScale;
        const scaledH = displayH * targetScale;
        const maxOffsetX = Math.max(0, (scaledW - cw) / 2);
        const maxOffsetY = Math.max(0, (scaledH - ch) / 2);
        const clampedX = Math.max(
          -maxOffsetX,
          Math.min(maxOffsetX, translateX.value)
        );
        const clampedY = Math.max(
          -maxOffsetY,
          Math.min(maxOffsetY, translateY.value)
        );
        translateX.value = withSpring(clampedX, {
          damping: 15,
          stiffness: 100,
          restDisplacementThreshold: 0.0001,
        });
        translateY.value = withSpring(clampedY, {
          damping: 15,
          stiffness: 100,
          restDisplacementThreshold: 0.0001,
        });
      }
    });

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      panStartX.value = translateX.value;
      panStartY.value = translateY.value;
    })
    .onChange((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      const cw = containerWidth.value;
      const ch = containerHeight.value;
      const iw = imageNaturalWidth.value;
      const ih = imageNaturalHeight.value;
      // Fallback: if any dimension unknown, allow free pan
      if (cw === 0 || ch === 0 || iw === 0 || ih === 0) {
        translateX.value = panStartX.value + event.translationX;
        translateY.value = panStartY.value + event.translationY;
        return;
      }
      const fit = Math.min(cw / iw, ch / ih);
      const displayW = iw * fit;
      const displayH = ih * fit;
      const scaledW = displayW * scale.value;
      const scaledH = displayH * scale.value;
      const maxOffsetX = Math.max(0, (scaledW - cw) / 2);
      const maxOffsetY = Math.max(0, (scaledH - ch) / 2);
      const nextX = panStartX.value + event.translationX;
      const nextY = panStartY.value + event.translationY;
      translateX.value = Math.max(-maxOffsetX, Math.min(maxOffsetX, nextX));
      translateY.value = Math.max(-maxOffsetY, Math.min(maxOffsetY, nextY));
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => {
    const width = containerWidth.value;
    const height = containerHeight.value;
    const iw = imageNaturalWidth.value;
    const ih = imageNaturalHeight.value;
    const fit =
      width === 0 || height === 0 || iw === 0 || ih === 0
        ? 1
        : Math.min(width / iw, height / ih);
    const displayW = iw * fit;
    const displayH = ih * fit;
    const scaledW = displayW * scale.value;
    const scaledH = displayH * scale.value;
    const maxOffsetX = Math.max(0, (scaledW - width) / 2);
    const maxOffsetY = Math.max(0, (scaledH - height) / 2);

    const centerX = width / 2;
    const centerY = height / 2;
    // Translate to keep the focal point stationary during scaling
    const dx = (focalX.value - centerX) * (1 - scale.value);
    const dy = (focalY.value - centerY) * (1 - scale.value);

    // Clamp pan so that dx + pan stays within bounds
    const panClampedX = Math.max(
      -maxOffsetX - dx,
      Math.min(maxOffsetX - dx, translateX.value)
    );
    const panClampedY = Math.max(
      -maxOffsetY - dy,
      Math.min(maxOffsetY - dy, translateY.value)
    );
    return {
      transform: [
        // Anchor scaling at focal
        { translateX: dx },
        { translateY: dy },
        { scale: scale.value },
        // Apply clamped pan
        { translateX: panClampedX },
        { translateY: panClampedY },
      ],
    };
  }, [url]);

  if (!visible || !url) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      presentationStyle='overFullScreen'
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onDismiss}
    >
      <View
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          containerWidth.value = width;
          containerHeight.value = height;
        }}
      >
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            style={[{ width: '100%', height: '100%' }, animatedStyle]}
          >
            <Image
              source={{ uri: url }}
              style={{ width: '100%', height: '100%' }}
              contentFit='contain'
              transition={150}
            />
          </Animated.View>
        </GestureDetector>
      </View>
      {/* <ImageViewer
        backgroundColor={'rgba(0,0,0,0.95)'}
        imageUrls={[{ url }]}
        renderIndicator={() => <></>}
        enableSwipeDown={true}
        onSwipeDown={onDismiss}
        saveToLocalByLongPress={false}
        renderImage={renderImage}
        renderHeader={() => (
          <View
            style={{
              position: 'absolute',
              top: 50,
              right: 16,
              flexDirection: 'row',
              gap: 12,
              zIndex: 100,
            }}
          >
            <Pressable
              onPress={onDismiss}
              style={{
                height: 36,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 14 }}>닫기</Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              style={{
                height: 36,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 14 }}>
                {saving ? '저장중…' : '다운로드'}
              </Text>
            </Pressable>
          </View>
        )}
      /> */}
      {saveDone && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={{
            position: 'absolute',
            bottom: 50,
            alignSelf: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: 'white' }}>
            {saveDone === 'ok' ? '저장 완료' : '저장 실패'}
          </Text>
        </Animated.View>
      )}
    </Modal>
  );
}
