import { router, useFocusEffect, useNavigation } from 'expo-router';
import React, {
  Fragment,
  memo,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Keyboard,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import {
  AndroidLayerType,
  CacheMode,
  ContentMode,
  ShouldStartLoadRequest,
  WebViewMessageEvent,
  WebViewProgressEvent,
} from 'react-native-webview/lib/WebViewTypes';

import { hapticLight } from '@/hooks/haptic';
import { updateWebImageViewerOpen } from '@/hooks/useImageViewer';
import {
  buildInitialSyncedStorageScript,
  removeSyncedItem,
  setSyncedItem,
  useSyncedStorageSnapshot,
} from '@/lib/synced-storage';
import { registerWebView } from '@/lib/webview-registry';
import Constants from 'expo-constants';
import { isDevice } from 'expo-device';
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CommonKeyboardAvoiding from './CommonKeyboardAvoiding';
import { IOSScrollToTop } from './IosScrollToTop';
import SplashImageView from './SplashImageView';

const AnimatedView = Animated.createAnimatedComponent(View);

const styles = StyleSheet.create({
  androidScrollView: {
    flex: 1,
    backgroundColor: 'black',
  },
  androidScrollViewContent: { flex: 1 },
  progressWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 2,
  },
  styledWebView: {
    flex: 1,
    backgroundColor: 'black',
  },
});

const parseJsonOnce = (text: string): any[] | null => {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

let testUrl: string | null = null;
// testUrl = 'http://localhost:3000';
// testUrl = 'https://painstorm-nextjs.vercel.app';

const originWhitelist = ['*'];

/**
 * 검색 화면 브릿지(app/search.tsx 전용). 상세: docs/search-webview-bridge.md
 * 입력(검색어)·지점은 네이티브가 소유하고, 이 값들을 웹(`/search`)으로 push한다.
 * 이 prop이 있을 때만 검색 관련 주입/메시지 처리가 활성화된다.
 */
export type SearchBridge = {
  /** 검색어(원문). 매 변경 시 웹으로 push */
  query: string;
  /** 지점 필터: 'ALL' | 지점명(압구정/잠실/수원/아차산) */
  branch: string;
  /** 웹이 최근검색 탭 등으로 검색어를 바꾸려 할 때(네이티브 입력값 반영) */
  onSetQuery?: (q: string) => void;
};

type Props = {
  urlPath: string;
  refetchWebviewRef?: RefObject<() => void>;
  CustomLoadingView?: React.FC;
  pullToRefreshEnabled?: boolean;
  withIOSKeyboardAvoiding?: boolean;
  search?: SearchBridge;
  /**
   * 검색 제출(엔터) 트리거 바인딩용 ref. current를 호출하면 submit push.
   * refetchWebviewRef와 동일하게 최상위 ref prop으로 둔다(중첩 ref 금지).
   */
  searchSubmitRef?: RefObject<() => void>;
};

const CommonWebview = ({
  urlPath,
  refetchWebviewRef,
  CustomLoadingView,
  pullToRefreshEnabled: pullToRefreshEnabledProp = true,
  withIOSKeyboardAvoiding,
  search,
  searchSubmitRef,
}: Props) => {
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();
  const adjustedSafeTop = useMemo(
    () => safeTop - (Platform.OS === 'ios' && safeTop > 32 ? 8 : -10),
    [safeTop],
  );

  const webViewRef = useRef<WebView | null>(null);
  const navigation = useNavigation();

  // 웹뷰 레지스트리 등록: 이 웹뷰가 살아 있는 동안 synced-storage 브로드캐스트 대상이 된다.
  useEffect(() => {
    const unregister = registerWebView(webViewRef);
    return unregister;
  }, []);

  // synced-storage 스냅샷 구독: 값이 바뀌면 리렌더되어 injectedJavaScriptBeforeContentLoaded가
  // 최신 스냅샷을 반영한다(다음 reload 시 올바른 초기값 주입).
  const syncedStorageSnapshot = useSyncedStorageSnapshot();

  const source = useMemo(
    () => ({
      uri: `${
        testUrl ||
        (Platform.OS === 'ios' && !isDevice
          ? 'http://localhost:3000'
          : 'https://painstorm-nextjs.vercel.app')
      }${urlPath}`,
    }),
    [urlPath],
  );

  const currentStateRef = useRef({
    canGoBack: false,
    url: source.uri,
  });
  const handleBackBtn = useCallback(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (currentStateRef.current.canGoBack) {
          webViewRef?.current?.goBack();
        } else {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            BackHandler.exitApp();
          }
        }
        return true;
      },
    );
    return () => backHandler.remove();
  }, [navigation]);
  useFocusEffect(handleBackBtn);

  const [loading, setLoading] = useState(true);
  const [topDimmingOn, setTopDimmingOn] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refresherEnabled, setEnableRefresher] = useState(true);
  const overlayOpacity = useSharedValue(1);

  const lastDeeplinkUrlRef = useRef<string | null>(null);
  const lastDeeplinkAtRef = useRef<number>(0);

  // ====== 검색 브릿지(app/search.tsx 전용) ======
  // search prop이 있을 때만 활성화. 웹으로 검색어/지점을 push하고,
  // SEARCH_* 단일 객체 메시지를 처리한다. docs/search-webview-bridge.md
  const searchEnabled = !!search;
  const searchQuery = search?.query;
  const searchBranch = search?.branch;
  const searchReadyRef = useRef(false);
  const searchEnabledRef = useRef(searchEnabled);
  // 항상 최신 값을 참조(ready flush / submit / 메시지 핸들러에서 사용)
  const searchLatestRef = useRef({ query: '', branch: 'ALL' });
  // onSetQuery는 메시지 핸들러 deps 오염을 막기 위해 ref로 참조
  const onSearchSetQueryRef = useRef(search?.onSetQuery);

  // 렌더 중 ref를 쓰지 않고 effect에서 최신 값으로 동기화한다.
  useEffect(() => {
    searchEnabledRef.current = searchEnabled;
    searchLatestRef.current = {
      query: searchQuery ?? '',
      branch: searchBranch ?? 'ALL',
    };
    onSearchSetQueryRef.current = search?.onSetQuery;
  });

  const sendSearch = useCallback(
    (payload: { q: string; branch: string; submit?: boolean }) => {
      if (!searchReadyRef.current) return; // ready 전이면 무시 → ready 시 flush로 반영
      const js = `window.PainstormSearch && window.PainstormSearch.onInput(${JSON.stringify(
        payload,
      )}); true;`;
      webViewRef.current?.injectJavaScript(js);
    },
    [],
  );

  // 검색어/지점 변경 시 웹으로 전달
  useEffect(() => {
    if (!searchEnabled) return;
    sendSearch({ q: searchQuery ?? '', branch: searchBranch ?? 'ALL' });
  }, [searchEnabled, searchQuery, searchBranch, sendSearch]);

  // 검색 제출(엔터) 트리거 바인딩 (refetchWebviewRef와 동일 패턴)
  useEffect(() => {
    if (searchSubmitRef) {
      searchSubmitRef.current = () =>
        sendSearch({
          q: searchLatestRef.current.query,
          branch: searchLatestRef.current.branch,
          submit: true,
        });
    }
  }, [searchSubmitRef, sendSearch]);

  const handlePostMessage = useCallback(
    ({ nativeEvent }: WebViewMessageEvent) => {
      // 검색 브릿지 메시지는 단일 객체({ type: 'SEARCH_*' })로 온다(배열 아님).
      if (searchEnabledRef.current) {
        let searchMsg: any = null;
        try {
          searchMsg = JSON.parse(nativeEvent.data);
        } catch {
          searchMsg = null;
        }
        if (searchMsg && !Array.isArray(searchMsg)) {
          if (searchMsg.type === 'SEARCH_WEB_READY') {
            searchReadyRef.current = true;
            sendSearch({
              q: searchLatestRef.current.query,
              branch: searchLatestRef.current.branch,
            });
            return;
          }
          if (
            searchMsg.type === 'SEARCH_SET_QUERY' &&
            typeof searchMsg.q === 'string'
          ) {
            onSearchSetQueryRef.current?.(searchMsg.q);
            return;
          }
          if (searchMsg.type === 'SEARCH_DISMISS_KEYBOARD') {
            Keyboard.dismiss();
            return;
          }
        }
      }

      const messageFromWebView = parseJsonOnce(nativeEvent.data);
      if (!messageFromWebView) return;

      messageFromWebView.forEach(
        (message: {
          type: string;
          params: Record<string, any>[] | Record<string, undefined>;
        }) => {
          switch (message.type) {
            case 'NAVIGATION_STATE_CHANGE':
              currentStateRef.current = {
                canGoBack: nativeEvent.canGoBack,
                url: nativeEvent.url,
              };
              break;
            case 'DIMMER_ON':
              setTopDimmingOn((prev) => (prev ? prev : true));
              break;
            case 'DIMMER_OFF':
              setTopDimmingOn((prev) => (prev ? false : prev));
              break;
            case 'DEEP_LINK':
              const { deeplinkUrl } =
                (message?.params as Record<string, any>) ?? {};
              if (__DEV__) console.log('웹뷰', { deeplinkUrl });
              // Deduplicate same deeplink in short interval to avoid double navigation
              const now = Date.now();
              if (
                deeplinkUrl &&
                deeplinkUrl === lastDeeplinkUrlRef.current &&
                now - lastDeeplinkAtRef.current < 800
              ) {
                return;
              }
              lastDeeplinkUrlRef.current = deeplinkUrl;
              lastDeeplinkAtRef.current = now;
              // 웹 내부 경로('/...')면 범용 웹뷰 스택으로 push한다.
              // (기능별 라우트를 만들지 않고 /webview 하나로 공통 처리)
              if (
                typeof deeplinkUrl === 'string' &&
                deeplinkUrl.startsWith('/')
              ) {
                hapticLight();
                router.push({
                  pathname: '/webview',
                  params: { path: deeplinkUrl },
                });
              }
              break;
            case 'GO_BACK':
              navigation.goBack();
              hapticLight();
              break;
            case 'WEBVIEW_BACK':
              if (currentStateRef.current.canGoBack) {
                webViewRef?.current?.goBack();
              } else {
                navigation.goBack();
              }
              break;
            case 'SOFT_HAPTIC_FEEDBACK':
              hapticLight();
              break;
            case 'DOWNLOAD_IMAGE':
              const downloadUrl = (message?.params as Record<string, any>)
                ?.url as string;
              if (!downloadUrl) break;
              (async () => {
                const sendStatus = (
                  status: 'loading' | 'done' | 'fail',
                  errorMessage?: string,
                ) => {
                  const detail = JSON.stringify({
                    status,
                    message: errorMessage,
                  });
                  webViewRef.current?.injectJavaScript(
                    `window.dispatchEvent(new CustomEvent('download-status', { detail: ${detail} })); true;`,
                  );
                };
                try {
                  // write-only 권한만 요청한다. 갤러리 읽기(READ_MEDIA_*) 권한은 사용하지 않는다
                  // (Google Play 사진·동영상 권한 정책 준수).
                  const perm = await MediaLibrary.requestPermissionsAsync(true);
                  if (!perm.granted) {
                    sendStatus('fail', 'permission_denied');
                    return;
                  }
                  sendStatus('loading');
                  const dir = new Directory(Paths.cache, 'images');
                  if (!dir.exists) dir.create();
                  const destFile = new File(dir, `img_${Date.now()}.jpg`);
                  const res = await File.downloadFileAsync(
                    downloadUrl,
                    destFile,
                  );
                  await MediaLibrary.saveToLibraryAsync(res.uri);
                  sendStatus('done');
                } catch (error) {
                  const errorMessage =
                    error instanceof Error ? error.message : String(error);
                  console.error('DOWNLOAD_IMAGE failed', error);
                  sendStatus('fail', errorMessage);
                }
              })();
              break;
            // 웹 이미지 뷰어가 떠 있는 동안은 pull-to-refresh를 끈다.
            // 안드로이드는 웹뷰가 RefreshControl 달린 ScrollView 안에 있어서,
            // 모달을 아래로 스와이프해 닫으려 하면(페이지는 최상단) 새로고침이 발동한다.
            // 웹이 DIMMER_ON/OFF도 함께 보내지만, 그 이전 버전 웹을 위해 여기서도 처리한다.
            case 'IMAGE_VIEWER_OPEN':
              updateWebImageViewerOpen(true);
              setTopDimmingOn((prev) => (prev ? prev : true));
              break;
            case 'IMAGE_VIEWER_CLOSE':
              updateWebImageViewerOpen(false);
              setTopDimmingOn((prev) => (prev ? false : prev));
              break;
            case 'CONSOLE':
              if (__DEV__) console.log('CONSOLE', message?.params);
              break;
            case 'OPEN_OUTER_LINK': {
              const outerUrl = (message?.params as Record<string, any>)?.url as
                string | undefined;
              if (!outerUrl) break;
              router.push({
                pathname: '/outerlink',
                params: { url: outerUrl },
              });
              break;
            }
            case 'SYNCED_STORAGE_SET': {
              const syncParams = (message?.params as Record<string, any>) ?? {};
              const key = syncParams.key as string | undefined;
              const value = syncParams.value as string | undefined;
              if (typeof key !== 'string' || typeof value !== 'string') break;
              // source는 이 웹뷰. 자기 자신에게는 다시 브로드캐스트하지 않는다(echo 방지).
              // 앱은 allowlist를 두지 않는다 — 웹에서 추가한 키가 앱 배포 없이 그대로 동기화된다.
              setSyncedItem(key, value, webViewRef);
              break;
            }
            case 'SYNCED_STORAGE_REMOVE': {
              const syncParams = (message?.params as Record<string, any>) ?? {};
              const key = syncParams.key as string | undefined;
              if (typeof key !== 'string') break;
              removeSyncedItem(key, webViewRef);
              break;
            }
            default:
              return;
          }
        },
      );
    },
    [navigation, sendSearch],
  );

  const onLoadProgress = useCallback(
    (event: WebViewProgressEvent) => {
      if (event.nativeEvent.progress !== 1 || !loading) return;
      // 다음 두 번의 페인트 이후로 로딩 종료 → 깜빡임 최소화
      try {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setLoading(false));
        });
      } catch {
        // 플랫폼/환경 이슈 시 기존 타임아웃 폴백
        setTimeout(() => setLoading(false), Platform?.OS === 'ios' ? 120 : 200);
      }
    },
    [loading],
  );

  const onContentProcessDidTerminate = useCallback(() => {
    webViewRef.current?.reload();
  }, []);

  useEffect(() => {
    if (loading) {
      overlayOpacity.value = 1;
      return;
    }
    overlayOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(setShowLoadingOverlay)(false);
      }
    });
  }, [loading, overlayOpacity]);

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    return { opacity: overlayOpacity.value };
  });

  // 앱 컨텍스트(앱 버전 + safe-area) 주입 스크립트.
  // 콘텐츠 로드 전(injectedJavaScriptBeforeContentLoaded)과 로드 후(injectedJavaScript)
  // 양쪽에 넣는다:
  //  - 로드 후에만 넣으면(안드로이드 = onPageFinished) 웹 하이드레이션이 먼저 끝나
  //    window.__safeArea / __appVersion을 못 읽고 굳는다(헤더가 상태바에 붙고,
  //    이미지 뷰어가 구버전 경로로 빠져 모달이 안 뜬다).
  //  - 안드로이드의 before-content는 onPageStarted 기반이라 documentStart 보장이 아니므로
  //    로드 후 주입도 "보장 폴백"으로 남긴다. (the-rich index-finpong 웹뷰와 동일 패턴)
  // 마지막에 safe-area-update를 쏴서 늦게 도착해도 웹이 다시 읽게 한다.
  const appContextScript = useMemo(() => {
    const appVersion = Constants.expoConfig?.version ?? '0.0.0';
    return `
window.__appVersion = '${appVersion}';
window.__safeArea = { top: ${adjustedSafeTop}, bottom: ${safeBottom} };
try { window.dispatchEvent(new Event('safe-area-update')); } catch (e) {}
`;
  }, [adjustedSafeTop, safeBottom]);

  //onNavigationStateChange ios,android 동작 방식이 다른문제 해결. https://github.com/react-native-webview/react-native-webview/issues/24
  const getNavigationStateScript = useMemo(() => {
    return `
${appContextScript}
(function() {
  function wrap(fn) {
    return function wrapper() {
      var res = fn.apply(this, arguments);
      window.ReactNativeWebView.postMessage('[{"type":"NAVIGATION_STATE_CHANGE"}]');
      return res;
    }
  }
  history.pushState = wrap(history.pushState);
  history.replaceState = wrap(history.replaceState);
  window.addEventListener('popstate', function() {
    window.ReactNativeWebView.postMessage('[{"type":"NAVIGATION_STATE_CHANGE"}]');
  });
})();
true;
`;
  }, [appContextScript]);

  // inset이 나중에 바뀌는 경우(회전/시스템 UI 변화)에 이미 떠 있는 페이지로 재주입.
  // 최초 주입은 위 before/after content 스크립트가 담당한다.
  useEffect(() => {
    webViewRef.current?.injectJavaScript(`${appContextScript} true;`);
  }, [appContextScript]);

  useEffect(() => {
    if (refetchWebviewRef) {
      refetchWebviewRef.current = () => {
        setLoading(true);
        setShowLoadingOverlay(true);
        webViewRef?.current?.reload();
        setTimeout(
          () => {
            setRefreshing(false);
            setTimeout(() => setLoading(false), 300);
          },
          Platform?.OS === 'ios' ? 500 : 1000,
        );
      };
    }
  }, [refetchWebviewRef]);

  // webViewRef.current?.postMessage('refetch_from_app');

  const handleScroll = useCallback((event: any) => {
    // 검색 모드: 웹 컨텐츠 스크롤(드래그) 시 네이티브 입력 키보드 내림
    if (searchEnabledRef.current) {
      Keyboard.dismiss();
    }
    const yOffset = Number(event.nativeEvent.contentOffset.y);
    if (yOffset <= 0) {
      setEnableRefresher(() => true);
    } else {
      setEnableRefresher(() => false);
    }
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshing(true);
    setLoading(true);
    setShowLoadingOverlay(true);
    webViewRef?.current?.reload();
    setTimeout(
      () => {
        setRefreshing(false);
        setTimeout(() => setLoading(false), Platform?.OS === 'ios' ? 150 : 250);
      },
      Platform?.OS === 'ios' ? 500 : 1000,
    );
  }, []);

  const onShouldStartLoadWithRequest = useCallback(
    (event: ShouldStartLoadRequest) => {
      if (
        event.url.includes('map.naver.com/p/search/') ||
        event.url.includes('nmap://search?query') ||
        event.url.includes('m.map.kakao.com/scheme/search') ||
        event.url.includes('kakaomap://search?q') ||
        event.url.includes('tel:')
      ) {
        Linking.openURL(event.url);
        return false;
      }

      return true;
    },
    [],
  );

  const pullToRefreshEnabled = topDimmingOn ? false : pullToRefreshEnabledProp;

  // synced-storage 초기 스냅샷. useSyncedStorageSnapshot 구독으로 값 변경 시 리렌더되며,
  // 이 prop이 새로 전달되면 다음 웹뷰 reload(pull-to-refresh 등)에서 최신 값이 주입된다.
  // 앱 컨텍스트(버전/safe-area)도 함께 넣어 웹이 첫 렌더부터 값을 보게 한다.
  const injectedJavaScriptBeforeContentLoaded = useMemo(
    () => `${appContextScript}\n${buildInitialSyncedStorageScript()}`,
    // syncedStorageSnapshot은 스냅샷 변경 시 스크립트를 재계산하기 위한 의도적 의존성이다
    // (buildInitialSyncedStorageScript가 내부적으로 최신 스토리지를 읽음).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncedStorageSnapshot, appContextScript],
  );

  const commonWebViewProps = useMemo(() => {
    return {
      ref: webViewRef,
      textZoom: 100,
      originWhitelist,
      source,
      javaScriptEnabled: true,
      injectedJavaScript: getNavigationStateScript,
      injectedJavaScriptBeforeContentLoaded,
      javaScriptCanOpenWindowsAutomatically: true,
      onShouldStartLoadWithRequest,
      onMessage: handlePostMessage,
      androidLayerType: 'hardware' as AndroidLayerType, // 안드로이드 그래픽 성능관련
      // ====== 동영상 관련 ==========
      allowsInlineMediaPlayback: true, // for only ios
      allowsAirPlayForMediaPlayback: true, // for only ios
      allowsFullscreenVideo: true, // for only android
      allowsProtectedMedia: true,
      allowFileAccess: true,
      mediaPlaybackRequiresUserAction: false, // true 면 ios 에서 videojs 지원 안됨.
      // ==========================
      bounces: true,
      decelerationRate: 0.998, // 스크롤 감속 속도 default 'fast' (only ios)
      setSupportMultipleWindows: false, // 안드로이드 _blank(새 창 열림) 막음
      showsHorizontalScrollIndicator: false,
      showsVerticalScrollIndicator: false,
      // ===== 웹 스토리지 관련 ====
      sharedCookiesEnabled: false,
      thirdPartyCookiesEnabled: false,
      domStorageEnabled: true,
      // cacheEnabled: ready,
      cacheEnabled: true,
      incognito: false,
      cacheMode: 'LOAD_CACHE_ELSE_NETWORK' as CacheMode,
      // cacheMode: ready
      //   ? ('LOAD_CACHE_ELSE_NETWORK' as CacheMode)
      //   : ('LOAD_NO_CACHE' as CacheMode),
      // ==========================
      mixedContentMode: 'always' as 'always', // android http 요청 허용
      // dataDetectorTypes: ['all'], // ios 전화번호, 이메일, 주소 등 자동 링크
      // ====================
      contentMode: 'mobile' as ContentMode, // iPad 에서 데스크탑 버전 -> 모바일로 고정 대응
      allowsBackForwardNavigationGestures:
        Platform.OS === 'ios' ? false : undefined,
      // ======= 웹 뷰 죽었을때 대응(ex. 앱을 백그라운드에 둔지 오래 되었으면 웹뷰가 죽음) =======
      onContentProcessDidTerminate, // for ios
      onRenderProcessGone: onContentProcessDidTerminate, // for android
      // =======================================================================
      scrollEnabled: !pullToRefreshEnabled ? false : true,
      // ===== 검색 모드: 네이티브 입력창이 소유한 키보드 대응 =====
      keyboardDisplayRequiresUserAction: searchEnabled ? false : undefined,
      hideKeyboardAccessoryView: searchEnabled ? true : undefined,
    };
  }, [
    getNavigationStateScript,
    injectedJavaScriptBeforeContentLoaded,
    handlePostMessage,
    onContentProcessDidTerminate,
    onShouldStartLoadWithRequest,
    pullToRefreshEnabled,
    searchEnabled,
    // ready,
    source,
  ]);

  const IosWrapper = useMemo(
    () => (withIOSKeyboardAvoiding ? CommonKeyboardAvoiding : Fragment),
    [withIOSKeyboardAvoiding],
  );

  if (Platform?.OS === 'android') {
    return (
      <>
        <CommonKeyboardAvoiding>
          <ScrollView
            scrollEnabled={!pullToRefreshEnabled ? false : refresherEnabled}
            nestedScrollEnabled={!pullToRefreshEnabled ? false : true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                enabled={!pullToRefreshEnabled ? false : refresherEnabled}
                onRefresh={triggerRefresh}
              />
            }
            style={styles.androidScrollView}
            contentContainerStyle={styles.androidScrollViewContent}
          >
            <WebView
              style={styles.styledWebView}
              {...commonWebViewProps}
              onScroll={handleScroll}
              onLoadProgress={onLoadProgress}
            />

            {showLoadingOverlay && (
              <AnimatedView
                style={[styles.progressWrapper, overlayAnimatedStyle]}
              >
                {CustomLoadingView ? (
                  <CustomLoadingView />
                ) : (
                  <SplashImageView />
                )}
              </AnimatedView>
            )}
          </ScrollView>
        </CommonKeyboardAvoiding>
      </>
    );
  }

  return (
    <>
      <IosWrapper>
        <WebView
          style={styles.styledWebView}
          {...commonWebViewProps}
          onLoadProgress={onLoadProgress}
          pullToRefreshEnabled={pullToRefreshEnabled}
          onScroll={searchEnabled ? handleScroll : undefined}
        />
        {showLoadingOverlay && (
          <AnimatedView style={[styles.progressWrapper, overlayAnimatedStyle]}>
            {CustomLoadingView ? <CustomLoadingView /> : <SplashImageView />}
          </AnimatedView>
        )}
      </IosWrapper>
      <IOSScrollToTop
        onStatusBarClicked={() => {
          webViewRef?.current?.injectJavaScript(
            `window.scrollTo({top:0, left:0, behavior: "smooth"});
document.querySelector('.rn-scroll-to-top')?.scrollTo({top: 0, left:0, behavior: 'smooth'});`,
          );
        }}
      />
    </>
  );
};

const areEqual = (prev: Props, cur: Props) => {
  return (
    prev?.urlPath === cur?.urlPath &&
    prev?.pullToRefreshEnabled === cur?.pullToRefreshEnabled &&
    prev?.withIOSKeyboardAvoiding === cur?.withIOSKeyboardAvoiding &&
    // 검색 모드: 검색어/지점이 바뀌면 리렌더되어 웹으로 push되어야 한다
    prev?.search?.query === cur?.search?.query &&
    prev?.search?.branch === cur?.search?.branch
  );
};

export default memo(CommonWebview, areEqual);
