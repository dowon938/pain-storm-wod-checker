import CommonWebview from '@/components/ui/CommonWebview';
import { hapticLight } from '@/hooks/haptic';
import { useSyncedStorage } from '@/lib/synced-storage';
import Octicons from '@expo/vector-icons/Octicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
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

// 검색 웹뷰 로딩 오버레이: 스플래시 대신 검정만(진입 애니메이션과 자연스럽게 이어짐).
// CommonWebview의 progressWrapper가 이미 검정 배경이라 아무것도 그리지 않아도 된다.
const BlackLoadingView = () => null;

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
  const navigation = useNavigation();
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
  const submitRef = useRef<() => void>(() => {});

  // 0: 원형 버튼(닫힘) → 1: 인풋(열림)
  const progress = useSharedValue(0);
  // 인풋 및 닫기 버튼 컬러애니메이션
  const colorProgress = useSharedValue(0);
  // 화면 콘텐츠 진입(페이드/슬라이드업)
  const content = useSharedValue(0);
  // 지점 칩 바 진입(입력 모프 끝난 뒤 fade-in + 아래→위 상승)
  const chips = useSharedValue(0);

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

  // 입력창 모프 진입 애니메이션.
  // 마운트 시점(JS)에서 시작하면 native-stack에선 화면이 실제로 보이기 전에
  // 애니메이션이 끝나버릴 수 있다(카드 전환이 빠를수록 더 심함). 그래서
  // 네이티브 전환 완료(transitionEnd) 시점에 재생해 프레젠테이션 종류/속도와
  // 무관하게 화면이 보인 뒤 모프가 보이도록 한다.
  useEffect(() => {
    let started = false;
    const startEntrance = () => {
      if (started) return;
      started = true;
      progress.value = withTiming(1, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
      colorProgress.value = withDelay(
        280,
        withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }),
      );
      content.value = withTiming(1, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
      });
      // 지점 칩은 입력 모프(320ms)가 끝난 뒤에 fade-in + 아래→위 상승.
      chips.value = withDelay(
        340,
        withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
      );
    };

    // 화면 진입(열림) 전환이 끝나면 시작. 닫힘 전환에는 반응하지 않는다.
    const unsub = (navigation as any).addListener(
      'transitionEnd',
      (e: { data?: { closing?: boolean } }) => {
        if (e?.data?.closing) return;
        startEntrance();
      },
    );
    // transitionEnd가 오지 않는 환경(애니메이션 없음 등) 폴백.
    const fallback = setTimeout(startEntrance, 450);

    return () => {
      unsub();
      clearTimeout(fallback);
    };
  }, [navigation, progress, colorProgress, content, chips]);

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

  // 지점 칩 바: fade-in + 아래→위 살짝 상승
  const chipsStyle = useAnimatedStyle(() => ({
    opacity: chips.value,
    transform: [{ translateY: interpolate(chips.value, [0, 1], [12, 0]) }],
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
    submitRef.current?.();
  };

  const paddingBottom = keyboardVisible
    ? 12
    : insets.bottom > 0
      ? insets.bottom
      : 16;

  return (
    <View style={styles.screen}>
      {/* 컨텐츠(제목/결과/최근/상세)는 웹에서 렌더. safe-area 포함 전체를 뒤로 깔음 */}
      <Animated.View style={[styles.webWrap, contentStyle]}>
        <CommonWebview
          urlPath='/search'
          CustomLoadingView={BlackLoadingView}
          searchSubmitRef={submitRef}
          search={{
            query,
            branch,
            onSetQuery: setQuery,
          }}
        />
      </Animated.View>

      {/* 입력 + 칩 오버레이 — 웹 위에 투명하게 떠 있고, 키보드 위로 올라감 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        pointerEvents='box-none'
      >
        <View style={styles.spacer} pointerEvents='none' />

        <View pointerEvents='box-none'>
          <LinearGradient
            colors={[
              'transparent',
              // 'rgba(255,255,255,0.8)',
              // 'rgba(255,255,255,0.8)',
              'transparent',
            ]}
            style={{
              position: 'absolute',
              bottom: -180,
              left: 0,
              right: 0,
              height: 270,
              opacity: 0.8,
            }}
          />
          {/* 지점 필터 칩 (입력 모프 후 fade-in + 상승) */}
          <Animated.View style={chipsStyle}>
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

          <View style={[styles.bar, { paddingBottom }]}>
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
                <View
                  style={[styles.xLine, { transform: [{ rotate: '45deg' }] }]}
                />
                <View
                  style={[styles.xLine, { transform: [{ rotate: '-45deg' }] }]}
                />
              </View>
            </AnimatedPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'black',
  },
  // 웹뷰: 절대배치로 화면 전체(safe-area 포함)를 뒤로 깔음
  webWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: 'black',
  },
  kav: {
    flex: 1,
  },
  // 웹뷰 터치를 통과시키는 투명 스페이서(결과 스크롤 영역)
  spacer: {
    flex: 1,
  },
  // 지점 필터 칩 바 — 입력 위에 떠 있음
  branchScroll: {
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
