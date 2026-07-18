import { hapticLight } from '@/hooks/haptic';
import Ionicons from '@expo/vector-icons/Ionicons';
import Octicons from '@expo/vector-icons/Octicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PADDING_H = 12;
const INPUT_PADDING_H = 8;
const BAR_HEIGHT = 52;
const CLOSE_SIZE = 52;
const GAP = 10;

// 스캐폴드용 더미 데이터 (추후 API/최근검색 연동 예정)
const RECENT_QUERIES = ['Pull-up', 'Thrusters', 'Wall Ball', 'Deadlift'];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const expandedWidth = width - INPUT_PADDING_H * 2 - CLOSE_SIZE - GAP;

  // 0: 원형 버튼(닫힘) → 1: 인풋(열림)
  const progress = useSharedValue(0);
  // 인풋 및 닫기 버튼 컬러애니메이션
  const colorProgress = useSharedValue(0);
  // 화면 콘텐츠 진입(페이드/슬라이드업)
  const content = useSharedValue(0);

  // 키보드 열림 여부 (열렸을 땐 하단 여백을 고정값으로)
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    // 스택 슬라이드업이 끝날 즈음 모프 시작
    progress.value = withDelay(
      120,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
    colorProgress.value = withDelay(
      400,
      withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }),
    );
    content.value = withDelay(
      120,
      withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );
  }, [progress, colorProgress, content]);

  const inputStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [BAR_HEIGHT, expandedWidth]),
  }));
  const colorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      colorProgress.value,
      [0, 1],
      ['#000000', '#2c2c2e'],
    ),
  }));

  // 인풋 내부 텍스트/마이크는 어느 정도 펼쳐진 뒤 나타남
  const inputInnerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.45, 1], [0, 1], 'clamp'),
  }));

  // 닫기 버튼은 모프 완료 후 페이드 인
  const closeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.7, 1], [0, 1], 'clamp'),
    transform: [
      { scale: interpolate(progress.value, [0.7, 1], [0.6, 1], 'clamp') },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: content.value,
    transform: [{ translateY: interpolate(content.value, [0, 1], [16, 0]) }],
  }));

  const onClose = () => {
    hapticLight();
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.screen, { paddingTop: insets.top + 8 }]}
    >
      <Animated.View style={[styles.body, contentStyle]}>
        <Text style={styles.title}>검색</Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근 검색</Text>
          <Pressable hitSlop={8} onPress={hapticLight}>
            <Text style={styles.clearText}>지우기</Text>
          </Pressable>
        </View>

        <View style={styles.chips}>
          {RECENT_QUERIES.map((q) => (
            <Pressable
              key={q}
              style={styles.chip}
              onPress={hapticLight}
              accessibilityRole='button'
            >
              <Octicons name='search' size={13} color='#8E8E93' />
              <Text style={styles.chipText}>{q}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      <View
        style={[
          styles.bar,
          {
            paddingBottom: keyboardVisible
              ? 12
              : insets.bottom > 0
                ? insets.bottom
                : 16,
          },
        ]}
      >
        <Animated.View style={[styles.input, inputStyle, colorStyle]}>
          <Octicons name='search' size={18} color='#8E8E93' />
          <Animated.View style={[styles.inputInner, inputInnerStyle]}>
            <TextInput
              autoFocus
              style={styles.textInput}
              placeholder='WOD 검색...'
              placeholderTextColor='#8E8E93'
              returnKeyType='search'
              selectionColor='#0A84FF'
            />
            <Ionicons name='mic-outline' size={20} color='#8E8E93' />
          </Animated.View>
        </Animated.View>

        <AnimatedPressable
          accessibilityRole='button'
          accessibilityLabel='닫기'
          onPress={onClose}
          style={[styles.close, closeStyle, colorStyle]}
        >
          <View style={styles.xIcon}>
            <View
              style={[styles.xLine, { transform: [{ rotate: '45deg' }] }]}
            />
            <View
              style={[styles.xLine, { transform: [{ rotate: '-45deg' }] }]}
            />
          </View>
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'black',
  },
  body: {
    flex: 1,
    paddingHorizontal: PADDING_H,
  },
  title: {
    color: 'white',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  clearText: {
    color: '#0A84FF',
    fontSize: 15,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
  },
  chipText: {
    color: 'white',
    fontSize: 15,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: GAP,
    paddingHorizontal: INPUT_PADDING_H,
    paddingTop: 8,
  },
  input: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  inputInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 17,
    padding: 0,
  },
  close: {
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    borderRadius: CLOSE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderColor: 'rgba(255,255,255,0.4)',
    borderWidth: StyleSheet.hairlineWidth,
  },
  xIcon: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xLine: {
    position: 'absolute',
    width: 26,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'white',
  },
});
