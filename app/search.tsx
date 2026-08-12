import RecentSearches from '@/components/search/RecentSearches';
import SearchResultCard from '@/components/search/SearchResultCard';
import { hapticLight } from '@/hooks/haptic';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  addRecentSearch,
  clearRecentSearches,
  getLastQuery,
  getRecentSearches,
  removeRecentSearch,
  setLastQuery,
} from '@/lib/recent-search';
import { searchWods, type SearchItem } from '@/lib/search-api';
import { useSyncedStorage } from '@/lib/synced-storage';
import Octicons from '@expo/vector-icons/Octicons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
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

// 검색 화면 — 완전 네이티브.
// 예전엔 웹(/search)이 컨텐츠를 그리고 입력/칩만 네이티브였다가, 다시 전부
// 웹으로 넘겼는데, iOS WKWebView의 키보드-뷰포트 기벽(문서 밀림, visualViewport
// 늦은 통지)과 싸우는 비용이 커서 화면 전체를 네이티브로 이식했다.
// - 데이터: docs/search-api.md의 /search.json (웹과 동일 명세, lib/search-api.ts)
// - 상세: 기존 /webview 스택으로 웹 상세(/search/detail)를 그대로 연다.
// - 진입 애니메이션/입력 바/칩은 예전 네이티브 셸(0a12a66)의 것을 복원.

const INPUT_PADDING_H = 8;
const BAR_HEIGHT = 52;
const CLOSE_SIZE = 52;
const GAP = 10;

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 280;

// 웹(pain-storm-wod-web) 폰트. 본문 400 / 강조 800 / 헤딩(Heavitas)
const FONT = 'Paperlogy';
const FONT_BOLD = 'PaperlogyExtraBold';

// 지점 필터. 'ALL' = 전체(필터 없음). 나머지는 지점명(= 검색 API branch 값).
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

  // 마지막 검색어 복원(검색 흐름의 연속성 — 웹 시절 DRAFT_KEY와 동일 동작).
  const [query, setQuery] = useState(() => getLastQuery());
  const trimmed = query.trim();
  useEffect(() => {
    setLastQuery(query);
  }, [query]);

  // 디바운스된 검색어. 빈 검색어는 디바운스 대상이 아니라 즉시 반영한다
  // (결과 비우고 최근검색 노출) — state 왕복 없이 렌더 중에 결정.
  const debouncedQ = useDebouncedValue(trimmed, DEBOUNCE_MS);
  const effectiveQ = trimmed ? debouncedQ : '';

  const [recent, setRecent] = useState<string[]>(() => getRecentSearches());

  const inputRef = useRef<TextInput>(null);

  // 검색(무한 스크롤). 페이지네이션/total은 지점 단위(docs/search-api.md).
  const {
    data,
    error,
    isError,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['wod-search', effectiveQ, branch],
    enabled: effectiveQ.length > 0,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      searchWods({
        q: effectiveQ,
        branch,
        limit: PAGE_SIZE,
        offset: pageParam,
        signal,
      }),
    getNextPageParam: (last) => {
      const next = last.page.offset + last.items.length;
      return next < last.total ? next : undefined;
    },
  });

  // FlatList의 data prop identity를 고정한다. 매 렌더마다 새 배열을 만들면
  // 카드가 memo여도 VirtualizedList가 통째로 재조정된다.
  const items = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? 0;

  // 디바운스 대기 중에도 "검색 중"으로 취급(웹과 동일: 입력 즉시 로딩 표기).
  const isSearching = !!trimmed && (trimmed !== effectiveQ || isLoading);
  const isReady = !!trimmed && !isSearching && !isError && !!data;

  // ── 진입 애니메이션 (예전 네이티브 셸과 동일) ──
  // 0: 원형 버튼(닫힘) → 1: 인풋(열림)
  const progress = useSharedValue(0);
  const colorProgress = useSharedValue(0);
  // 화면 콘텐츠 진입(페이드/슬라이드업)
  const content = useSharedValue(0);
  // 지점 칩 바 진입(입력 모프 끝난 뒤 fade-in + 아래→위 상승)
  const chips = useSharedValue(0);

  // 마운트 시점(JS)에서 시작하면 native-stack에선 화면이 실제로 보이기 전에
  // 애니메이션이 끝나버릴 수 있다. 네이티브 전환 완료(transitionEnd) 시점에 재생.
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
      chips.value = withDelay(
        340,
        withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
      );
    };

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
  const inputInnerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.45, 1], [0, 1], 'clamp'),
  }));
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
  const chipsStyle = useAnimatedStyle(() => ({
    opacity: chips.value,
    transform: [{ translateY: interpolate(chips.value, [0, 1], [12, 0]) }],
  }));

  // ── 키보드 열림 여부 (열렸을 땐 하단 여백을 고정값으로) ──
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

  // ── 핸들러 ──
  // X 버튼은 2단계: 검색어가 있으면 비우기만(키보드 유지), 없으면 화면 닫기.
  const onClose = () => {
    hapticLight();
    if (query.length > 0) {
      setQuery('');
      return;
    }
    router.back();
  };

  const onSelectBranch = (value: string) => {
    if (value === branch) return;
    hapticLight();
    setBranch(value);
  };

  // 마지막으로 최근검색에 커밋한 검색어. 같은 검색어를 반복 저장하지 않기 위한 가드.
  // 저장 결과는 dedupe라 값 자체는 같지만 addRecentSearch가 매번 새 배열을 반환해
  // setRecent → 화면 전체 리렌더 + MMKV write가 딸려온다. 드래그마다 이게 도는 건 낭비.
  const committedTermRef = useRef<string | null>(null);
  const commitRecent = useCallback((term: string) => {
    if (!term || committedTermRef.current === term) return;
    committedTermRef.current = term;
    setRecent(addRecentSearch(term));
  }, []);

  // 엔터(검색) → 최근검색 저장. 결과 갱신은 디바운스 검색이 이미 처리한다.
  const onSubmit = () => {
    commitRecent(trimmed);
  };

  // 결과를 드래그하면 키보드를 내린다(keyboardDismissMode='on-drag').
  // 결과를 스크롤한다 = 그 검색어로 결과를 훑어봤다는 뜻이라, 엔터를 안 눌렀어도
  // 이 시점에 최근검색으로 저장한다(웹과 동일). 키보드 열림 여부는 확인하지
  // 않는다 — on-drag 디스미스가 이 콜백보다 먼저 처리되면 이미 닫혀 있어
  // 저장이 스킵된다.
  const onScrollBeginDrag = useCallback(() => {
    commitRecent(query.trim());
  }, [query, commitRecent]);

  const onSelectRecent = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  // 결과 탭 → 웹 상세(/search/detail)를 기존 /webview 스택으로 연다.
  const openDetail = useCallback(
    (item: SearchItem) => {
      Keyboard.dismiss();
      const path = `/search/detail?date=${encodeURIComponent(
        item.date,
      )}&branch=${encodeURIComponent(item.branchId)}`;
      router.push({ pathname: '/webview', params: { path } });
    },
    [router],
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── 레이아웃 값 ──
  const paddingBottom = keyboardVisible
    ? 12
    : insets.bottom > 0
      ? insets.bottom
      : 16;

  // 헤더는 리스트 위에 떠 있다(웹의 fixed 헤더 대응). 리스트는 그 높이만큼
  // 상단 패딩을 확보한다. 건수 라인은 자리를 항상 예약해 패딩 점프를 막는다.
  const headerHeight = insets.top + 12 + 38 + 22;
  // 하단 오버레이(칩 + 입력 바)에 가리지 않도록 확보할 리스트 하단 여백.
  const listBottomPad = 128 + (keyboardVisible ? 12 : insets.bottom);

  const branchLabel = branch === 'ALL' ? '전체' : branch;
  const countText = isReady
    ? `${branchLabel} “${effectiveQ}” 결과 ${total}건`
    : ' ';

  // ── 리스트 props ──
  // 인라인으로 두면 부모가 리렌더될 때마다 새 identity가 되어 카드의 memo가
  // 무의미해진다(셀 element 재생성 + props 비교가 매번 돈다).
  const renderItem = useCallback(
    ({ item }: { item: SearchItem }) => (
      <SearchResultCard item={item} onSelect={openDetail} />
    ),
    [openDetail],
  );
  const keyExtractor = useCallback(
    (item: SearchItem) => `${item.date}-${item.branchId}`,
    [],
  );
  const recentContentStyle = useMemo(
    () => ({ paddingTop: headerHeight, paddingBottom: listBottomPad }),
    [headerHeight, listBottomPad],
  );
  const listContentStyle = useMemo(
    () => ({
      paddingTop: headerHeight + 4,
      paddingBottom: listBottomPad,
      paddingHorizontal: 12,
      gap: 8,
    }),
    [headerHeight, listBottomPad],
  );
  const listFooter = useMemo(
    () =>
      isFetchingNextPage ? (
        <Text style={styles.footerText}>불러오는 중…</Text>
      ) : !hasNextPage ? (
        <Text style={styles.footerText}>더 이상 결과가 없습니다</Text>
      ) : null,
    [isFetchingNextPage, hasNextPage],
  );

  return (
    <View style={styles.screen}>
      {/* ── 컨텐츠(헤더 + 결과/최근검색) — 진입 시 페이드/슬라이드업 ── */}
      <Animated.View style={[styles.content, contentStyle]}>
        {/* 빈 검색어: 최근검색 */}
        {!trimmed && (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={recentContentStyle}
            keyboardShouldPersistTaps='handled'
            keyboardDismissMode='on-drag'
            automaticallyAdjustKeyboardInsets
          >
            <RecentSearches
              items={recent}
              onSelect={onSelectRecent}
              onRemove={(term) => setRecent(removeRecentSearch(term))}
              onClear={() => setRecent(clearRecentSearches())}
            />
          </ScrollView>
        )}

        {/* 검색 중 / 에러 / 결과 없음 */}
        {!!trimmed && isSearching && (
          <Text style={[styles.stateText, { marginTop: headerHeight + 52 }]}>
            검색 중…
          </Text>
        )}
        {!!trimmed && !isSearching && isError && (
          <Text
            style={[
              styles.stateText,
              styles.errorText,
              { marginTop: headerHeight + 52 },
            ]}
          >
            {error instanceof Error ? error.message : '검색에 실패했습니다.'}
          </Text>
        )}
        {isReady && items.length === 0 && (
          <View style={[styles.emptyWrap, { marginTop: headerHeight + 40 }]}>
            <Text style={styles.stateText}>검색 결과가 없습니다.</Text>
            <Text style={styles.emptyHint}>다른 검색어로 시도해 보세요.</Text>
          </View>
        )}

        {/* 결과 리스트 */}
        {isReady && items.length > 0 && (
          <FlatList
            style={styles.fill}
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={listContentStyle}
            keyboardShouldPersistTaps='handled'
            keyboardDismissMode='on-drag'
            automaticallyAdjustKeyboardInsets
            onScrollBeginDrag={onScrollBeginDrag}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.6}
            ListFooterComponent={listFooter}
          />
        )}

        {/* ── 상단 헤더 오버레이: 검정 그라디언트 + "검색" 타이틀 + 결과 건수 ── */}
        <View style={styles.headerWrap} pointerEvents='none'>
          <LinearGradient
            colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0)']}
            style={[styles.headerGradient, { height: headerHeight + 24 }]}
          />
          <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16 }}>
            <Text style={styles.title}>검색</Text>
            <Text style={styles.countText} numberOfLines={1}>
              {countText}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* ── 입력 + 칩 오버레이 — 키보드 위로 올라감 ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        pointerEvents='box-none'
      >
        <View style={styles.spacer} pointerEvents='none' />

        <View pointerEvents='box-none'>
          {/* 하단 그라디언트 — 리스트가 바 밑에서 자연스럽게 어두워진다 */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.9)']}
            style={styles.bottomGradient}
            pointerEvents='none'
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
                    style={[
                      styles.branchChip,
                      active && styles.branchChipActive,
                    ]}
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
                  ref={inputRef}
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
              accessibilityLabel={query.length > 0 ? '검색어 지우기' : '닫기'}
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
  // 컨텐츠: 절대배치로 화면 전체(safe-area 포함)를 뒤로 깔음
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
  },
  fill: {
    flex: 1,
  },
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0.85,
  },
  title: {
    fontFamily: FONT_BOLD,
    fontSize: 30,
    lineHeight: 38,
    color: 'white',
  },
  countText: {
    marginTop: 2,
    fontFamily: FONT,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.45)',
  },
  stateText: {
    fontFamily: FONT,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorText: {
    color: '#F87171',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 4,
  },
  emptyHint: {
    fontFamily: FONT,
    fontSize: 12,
    color: '#4B5563',
  },
  footerText: {
    paddingVertical: 12,
    fontFamily: FONT,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  kav: {
    flex: 1,
  },
  // 리스트 터치를 통과시키는 투명 스페이서(결과 스크롤 영역)
  spacer: {
    flex: 1,
  },
  bottomGradient: {
    position: 'absolute',
    top: -48,
    left: 0,
    right: 0,
    bottom: -34,
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
