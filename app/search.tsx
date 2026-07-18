import {
  SearchWebview,
  type SearchWebviewHandle,
} from '@/components/ui/SearchWebview';
import { hapticLight } from '@/hooks/haptic';
import { useSyncedStorage } from '@/lib/synced-storage';
import Octicons from '@expo/vector-icons/Octicons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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

const INPUT_PADDING_H = 8;
const BAR_HEIGHT = 52;
const CLOSE_SIZE = 52;
const GAP = 10;

// 웹(pain-storm-wod-web) 본문 폰트. 본문 400 / 강조 800
const FONT = 'Paperlogy';
const FONT_BOLD = 'PaperlogyExtraBold';

// 지점 필터. 'ALL' = 전체(필터 없음). 나머지는 지점명(= 웹/브릿지 branch 값).
const BRANCH_OPTIONS = [
  { label: '전체', value: 'ALL' },
  { label: '압구정', value: '압구정' },
  { label: '잠실', value: '잠실' },
  { label: '수원', value: '수원' },
  { label: '아차산', value: '아차산' },
] as const;

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const expandedWidth = width - INPUT_PADDING_H * 2 - CLOSE_SIZE - GAP;

  // 선호지점('perferBranch': 'ALL' | 지점명)으로 필터 초기 선택.
  // 여기서 바꿔도 전역 설정은 건드리지 않는 로컬 검색 스코프.
  const [preferred] = useSyncedStorage('perferBranch', { defaultValue: 'ALL' });
  const [branch, setBranch] = useState<string>(() =>
    BRANCH_OPTIONS.some((b) => b.value === preferred) ? preferred : 'ALL',
  );

  const [query, setQuery] = useState('');
  const webRef = useRef<SearchWebviewHandle>(null);

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

  // 인풋 내부 텍스트는 어느 정도 펼쳐진 뒤 나타남
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

  const onSelectBranch = (value: string) => {
    if (value === branch) return;
    hapticLight();
    setBranch(value);
  };

  const onSubmit = () => {
    webRef.current?.submit();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.screen, { paddingTop: insets.top + 8 }]}
    >
      {/* 컨텐츠(제목/결과/최근/상세)는 웹에서 렌더 */}
      <Animated.View style={[styles.body, contentStyle]}>
        <SearchWebview
          ref={webRef}
          query={query}
          branch={branch}
          onSetQuery={setQuery}
        />

        {/* 지점 필터 칩 — 웹 컨텐츠 위에 떠 있음 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
          style={styles.branchScroll}
          contentContainerStyle={styles.branchBar}
        >
          {BRANCH_OPTIONS.map((opt) => {
            const active = opt.value === branch;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onSelectBranch(opt.value)}
                style={[styles.branchChip, active && styles.branchChipActive]}
                accessibilityRole='button'
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.branchChipText,
                    active && styles.branchChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
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
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={onSubmit}
              style={styles.textInput}
              placeholder='WOD 검색...'
              placeholderTextColor='#8E8E93'
              returnKeyType='search'
              selectionColor='#0A84FF'
              autoCorrect={false}
              autoCapitalize='none'
            />
            {query.length > 0 ? (
              <Pressable
                hitSlop={8}
                onPress={() => setQuery('')}
                accessibilityLabel='입력 지우기'
              >
                <Octicons name='x-circle-fill' size={16} color='#8E8E93' />
              </Pressable>
            ) : null}
          </Animated.View>
        </Animated.View>

        <AnimatedPressable
          accessibilityRole='button'
          accessibilityLabel='닫기'
          onPress={onClose}
          style={[styles.close, closeStyle, colorStyle]}
        >
          <View style={styles.xIcon}>
            <View style={[styles.xLine, { transform: [{ rotate: '45deg' }] }]} />
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
    overflow: 'hidden',
  },
  // 지점 필터 칩 바 — 웹 위에 떠 있는 하단 오버레이
  branchScroll: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: 'transparent',
  },
  branchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: INPUT_PADDING_H + 8,
    paddingVertical: 8,
  },
  branchChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    // 떠 있는 느낌 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  branchChipActive: {
    backgroundColor: 'white',
  },
  branchChipText: {
    color: '#C7C7CC',
    fontSize: 14,
    fontFamily: FONT_BOLD,
  },
  branchChipTextActive: {
    color: 'black',
  },
  // 하단 바
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
    gap: 8,
    marginLeft: 10,
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 17,
    padding: 0,
    fontFamily: FONT,
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
