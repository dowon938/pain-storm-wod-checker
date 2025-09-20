import { hapticLight } from '@/hooks/haptic';
import {
  closeImageViewer,
  useWatchImageUrl,
  useWatchVisible,
} from '@/hooks/useImageViewer';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import React from 'react';
import {
  GestureResponderEvent,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export default function ImageViewerOverlay() {
  const visible = useWatchVisible();
  const url = (useWatchImageUrl as unknown as () => string | undefined)();

  const [saving, setSaving] = React.useState(false);
  const [saveDone, setSaveDone] = React.useState<'ok' | 'fail' | undefined>();

  const onDismiss = () => {
    hapticLight();
    closeImageViewer();
  };

  const onSave = async (e: GestureResponderEvent) => {
    e.stopPropagation();
    if (!url) return;
    hapticLight();
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
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
              const verticalSwipe =
                Math.abs(gesture.dy) > 60 &&
                Math.abs(gesture.vy) > 0.6 &&
                Math.abs(gesture.dy) > Math.abs(gesture.dx);
              if (isAtOne && verticalSwipe) {
                onDismiss();
              }
            }}
          >
            <Image
              style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
              source={{ uri: url }}
            />
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
