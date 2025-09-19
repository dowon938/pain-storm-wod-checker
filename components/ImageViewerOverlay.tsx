import {
  closeImageViewer,
  useWatchImageUrl,
  useWatchVisible,
} from '@/hooks/useImageViewer';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import React from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SharedTransition,
  SharedTransitionType,
  withSpring,
} from 'react-native-reanimated';

const screen = Dimensions.get('window');

export default function ImageViewerOverlay() {
  const visible = useWatchVisible();
  const url = (useWatchImageUrl as unknown as () => string | undefined)();

  const [saving, setSaving] = React.useState(false);
  const [saveDone, setSaveDone] = React.useState<'ok' | 'fail' | undefined>();

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

  // Only Shared Transition open: remove custom progress/gestures

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
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.85)',
            }}
          />
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <Animated.View
              sharedTransitionTag={url}
              sharedTransitionStyle={
                SharedTransition.custom((values) => {
                  'worklet';
                  return {
                    height: withSpring(values.targetHeight),
                    width: withSpring(values.targetWidth),
                  };
                })
                  .progressAnimation((values, progress) => {
                    'worklet';
                    const getValue = (
                      progress: number,
                      target: number,
                      current: number
                    ): number => {
                      return progress * (target - current) + current;
                    };
                    return {
                      width: getValue(
                        progress,
                        values.targetWidth,
                        values.currentWidth
                      ),
                      height: getValue(
                        progress,
                        values.targetHeight,
                        values.currentHeight
                      ),
                    };
                  })
                  .defaultTransitionType(SharedTransitionType.ANIMATION)
                //   SharedTransition.custom((values) => {
                //   'worklet';
                //   return {
                //     transform: [
                //       {
                //         translateX: values.targetOriginX - values.currentOriginX,
                //       },
                //       {
                //         translateY: values.targetOriginY - values.currentOriginY,
                //       },
                //       { scaleX: values.targetWidth / values.currentWidth },
                //       { scaleY: values.targetHeight / values.currentHeight },
                //     ],
                //   };
                // }
              }
              style={{ width: '100%', height: '100%' }}
            >
              <Image
                source={{ uri: url }}
                style={{ width: '100%', height: '100%' }}
                contentFit='contain'
              />
            </Animated.View>
          </View>
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
    </Modal>
  );
}
