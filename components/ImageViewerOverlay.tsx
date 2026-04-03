import { hapticLight } from '@/hooks/haptic';
import {
  closeImageViewer,
  useWatchImageUrl,
  useWatchInitialIndex,
  useWatchVisible,
} from '@/hooks/useImageViewer';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import { BlurView } from 'expo-blur';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import React from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideInRight,
} from 'react-native-reanimated';

export default function ImageViewerOverlay() {
  const visible = useWatchVisible();
  // 초기 인덱스 옵션 (스토어에서 관찰)
  const initialIndex =
    (useWatchInitialIndex as unknown as () => number | undefined)() ?? 0;
  const url = (
    useWatchImageUrl as unknown as () => string | string[] | undefined
  )();

  const images = React.useMemo(() => {
    if (!url) return [] as string[];
    return Array.isArray(url) ? url.filter(Boolean) : [url];
  }, [url]);

  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  // URL 배열이 바뀌거나, 초기 인덱스가 바뀌면 다시 맞춰준다
  React.useEffect(() => {
    if (images.length === 0) return;
    const clamped = Math.max(0, Math.min(images.length - 1, initialIndex));
    setCurrentIndex(clamped);
  }, [initialIndex, images.length]);
  const [slideDir, setSlideDir] = React.useState<'initial' | 'left' | 'right'>(
    'initial',
  );

  const [saving, setSaving] = React.useState(false);
  const [saveDone, setSaveDone] = React.useState<'ok' | 'fail' | undefined>();

  const onDismiss = () => {
    setSlideDir('initial');
    hapticLight();
    closeImageViewer();
  };

  const onSave = async (e: GestureResponderEvent) => {
    e.stopPropagation();
    if (images.length === 0) return;
    hapticLight();
    try {
      setSaving(true);
      setSaveDone(undefined);
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) throw new Error('permission_denied');

      const targetUrl = images[currentIndex] ?? images[0];
      const destination = new Directory(Paths.cache, 'images');
      destination.create();
      const res = await File.downloadFileAsync(targetUrl, destination);
      await MediaLibrary.saveToLibraryAsync(res.uri);
      setSaveDone('ok');
      setTimeout(() => setSaveDone(undefined), 1200);
    } catch (error) {
      console.error(error);
      setSaveDone('fail');
      setTimeout(() => setSaveDone(undefined), 1500);
    } finally {
      setSaving(false);
    }
  };
  const [loading, setLoading] = React.useState(false);

  if (!visible || images.length === 0) return null;

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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            backgroundColor:
              Platform.OS === 'ios' ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.95)',
          }}
        >
          {Platform.OS === 'ios' && (
            <BlurView
              style={StyleSheet.absoluteFill}
              intensity={30}
              tint='dark'
              pointerEvents='none'
            />
          )}
          <View
            style={{
              position: 'absolute',
              top: 56,
              right: 16,
              flexDirection: 'row',
              gap: 12,
              zIndex: 100,
            }}
          >
            <View
              style={{
                paddingHorizontal: 12,
                height: 40,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 15 }}>
                {currentIndex + 1} / {images.length}
              </Text>
            </View>
            <Pressable
              onPress={onDismiss}
              style={{
                height: 40,
                paddingHorizontal: 16,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 15 }}>닫기</Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              style={{
                height: 40,
                paddingHorizontal: 16,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 15 }}>
                {saving ? '저장중…' : '다운로드'}
              </Text>
            </Pressable>
          </View>
          <ReactNativeZoomableView
            maxZoom={4}
            minZoom={1}
            zoomStep={4}
            initialZoom={1}
            bindToBorders={true}
            visualTouchFeedbackEnabled={false}
            onPanResponderEnd={(_e, gesture, ev) => {
              const zoom = ev.zoomLevel;
              const isAtOne = Math.abs(zoom - 1) < 0.02; // tolerate float jitter
              const { dx, dy, vx, vy } = gesture;
              const horizontalSwipe =
                isAtOne &&
                Math.abs(dx) > 60 &&
                Math.abs(vx) > 0.4 &&
                Math.abs(dx) > Math.abs(dy);
              const verticalSwipe =
                isAtOne &&
                Math.abs(dy) > 60 &&
                Math.abs(vy) > 0.6 &&
                Math.abs(dy) > Math.abs(dx);

              if (horizontalSwipe) {
                if (dx < 0) {
                  setSlideDir('right');
                  if (currentIndex < images.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                  } else {
                    setCurrentIndex(0);
                  }
                } else if (dx > 0) {
                  setSlideDir('left');
                  if (currentIndex > 0) {
                    setCurrentIndex(currentIndex - 1);
                  } else {
                    setCurrentIndex(images.length - 1);
                  }
                }
                return;
              }

              if (verticalSwipe) {
                onDismiss();
              }
            }}
          >
            <Animated.View
              key={currentIndex}
              entering={
                slideDir === 'initial'
                  ? FadeIn
                  : slideDir === 'right'
                    ? SlideInRight.duration(220)
                    : SlideInLeft.duration(220)
              }
              style={{ width: '100%', height: '100%' }}
            >
              <Image
                style={{ width: '100%', height: '100%' }}
                source={{ uri: images[currentIndex] }}
                onLoadStart={() => {
                  setLoading(true);
                }}
                onLoadEnd={() => {
                  setLoading(false);
                }}
                contentFit='contain'
              />
              {loading && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <ActivityIndicator size='small' color='white' />
                </View>
              )}
            </Animated.View>
          </ReactNativeZoomableView>
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
      </GestureHandlerRootView>
    </Modal>
  );
}
