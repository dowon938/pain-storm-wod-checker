import {
  closeImageViewer,
  useWatchImageUrl,
  useWatchOrigin,
  useWatchVisible,
} from '@/hooks/useImageViewer';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import React from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const screen = Dimensions.get('window');

export default function ImageViewerOverlay() {
  const visible = useWatchVisible();
  const url = (useWatchImageUrl as unknown as () => string | undefined)();
  const origin = (
    useWatchOrigin as unknown as () =>
      | {
          x: number;
          y: number;
          width: number;
          height: number;
        }
      | undefined
  )();

  const progress = useSharedValue(0);
  const [saving, setSaving] = React.useState(false);
  const [saveDone, setSaveDone] = React.useState<'ok' | 'fail' | undefined>();

  React.useEffect(() => {
    if (visible) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = withTiming(0, {
        duration: 200,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible, progress]);
  const rStyle = useAnimatedStyle(() => {
    if (!origin) return { opacity: 0 };
    const t = progress.value;

    const top = origin.y * (1 - t) + 0 * t;
    const left = origin.x * (1 - t) + 0 * t;
    const width = origin.width * (1 - t) + screen.width * t;
    const height = origin.height * (1 - t) + screen.height * t;

    return {
      position: 'absolute',
      top,
      left,
      width,
      height,
    } as const;
  });

  const bgStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
  }));

  const onDismiss = () => {
    closeImageViewer();
  };

  const onSave = async (e: GestureResponderEvent) => {
    e.stopPropagation();
    if (!url) return;
    try {
      setSaving(true);
      setSaveDone(undefined);
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) throw new Error('permission_denied');

      const fileUri = FileSystem.cacheDirectory + `image-${Date.now()}.jpg`;
      const res = await FileSystem.downloadAsync(url, fileUri);
      await MediaLibrary.saveToLibraryAsync(res.uri);
      setSaveDone('ok');
      setTimeout(() => setSaveDone(undefined), 1200);
    } catch {
      setSaveDone('fail');
      setTimeout(() => setSaveDone(undefined), 1500);
    } finally {
      setSaving(false);
    }
  };

  // Zoom & Pan shared states
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(4, startScale.value * e.scale));
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      if (scale.value <= 1.01) {
        scale.value = withTiming(1, { duration: 160 });
        translateX.value = withTiming(0, { duration: 160 });
        translateY.value = withTiming(0, { duration: 160 });
      }
    });

  const composedGesture = Gesture.Simultaneous(pinch, pan);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!visible || !url || !origin) return null;

  return (
    <View
      pointerEvents={visible ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
        elevation: 999,
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
          },
          bgStyle,
        ]}
        pointerEvents='none'
      />
      <View style={{ flex: 1 }}>
        <Animated.View
          style={[rStyle, { justifyContent: 'center', alignItems: 'center' }]}
        >
          <GestureHandlerRootView style={{ width: '100%', height: '100%' }}>
            <GestureDetector gesture={composedGesture}>
              <Animated.View
                style={[{ width: '100%', height: '100%' }, zoomStyle]}
              >
                <Image
                  source={{ uri: url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit='contain'
                />
              </Animated.View>
            </GestureDetector>
          </GestureHandlerRootView>
        </Animated.View>
      </View>

      <View
        style={{
          position: 'absolute',
          top: 50,
          right: 16,
          flexDirection: 'row',
          gap: 12,
        }}
      >
        <Pressable
          onPress={onDismiss}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Text style={{ color: 'white', fontSize: 14 }}>닫기</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Text style={{ color: 'white', fontSize: 14 }}>
            {saving ? '저장중…' : '다운로드'}
          </Text>
        </Pressable>
      </View>

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
    </View>
  );
}
