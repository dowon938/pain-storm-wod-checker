import { useFocusEffect } from '@react-navigation/native';
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
  InteractionManager,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
import { openImageViewer } from '@/hooks/useImageViewer';
import { isDevice } from 'expo-device';
import { useNavigation } from 'expo-router';
import Animated, { FadeOut } from 'react-native-reanimated';
import CommonKeyboardAvoiding from './CommonKeyboardAvoiding';
import { IOSScrollToTop } from './IosScrollToTop';

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
// testUrl = 'http://10.30.10.205:3000';
// testUrl = 'https://painstorm-nextjs.vercel.app';

const originWhitelist = ['*'];

type Props = {
  urlPath: string;
  refetchWebviewRef?: RefObject<() => void>;
  CustomLoadingView?: React.FC;
  pullToRefreshEnabled?: boolean;
  withIOSKeyboardAvoiding?: boolean;
};

const CommonWebview = ({
  urlPath,
  refetchWebviewRef,
  CustomLoadingView,
  pullToRefreshEnabled: pullToRefreshEnabledProp = true,
  withIOSKeyboardAvoiding,
}: Props) => {
  const count = useRef(0);
  count.current += 1;
  if (__DEV__) console.log(urlPath, count.current);

  const webViewRef = useRef<WebView | null>(null);
  // const router = useRouter();
  const navigation = useNavigation();

  const source = useMemo(
    () => ({
      uri: `${
        testUrl ||
        (Platform.OS === 'ios' && !isDevice
          ? 'http://localhost:3000'
          : 'https://painstorm-nextjs.vercel.app')
      }${urlPath}`,
    }),
    [urlPath]
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
          navigation.goBack();
        }
        return true;
      }
    );
    return () => backHandler.remove();
  }, [navigation]);
  useFocusEffect(handleBackBtn);

  const [loading, setLoading] = useState(true);
  const [topDimmingOn, setTopDimmingOn] = useState(false);

  const lastDeeplinkUrlRef = useRef<string | null>(null);
  const lastDeeplinkAtRef = useRef<number>(0);

  const handlePostMessage = useCallback(
    ({ nativeEvent }: WebViewMessageEvent) => {
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
            // case POST_MESSAGE_TYPE.NAVIGATE:
            //   const { screenName, routeParams } =
            //     (message?.params as Record<string, any>) ?? {};
            //   navigation.navigate(screenName, routeParams);
            //   break;
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

              InteractionManager.runAfterInteractions(() => {
                // processURL({
                //   url: deeplinkUrl,
                //   navigation,
                //   isPushNotification: false,
                // });
              });
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
            case 'CONSOLE':
              if (__DEV__) console.log('CONSOLE', message?.params);
              break;
            default:
              return;
          }
        }
      );
    },
    [navigation]
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
    [loading]
  );

  const onContentProcessDidTerminate = useCallback(() => {
    webViewRef.current?.reload();
  }, []);

  //onNavigationStateChange ios,android 동작 방식이 다른문제 해결. https://github.com/react-native-webview/react-native-webview/issues/24
  const getNavigationStateScript = useMemo(() => {
    return `
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
  }, []);

  useEffect(() => {
    if (refetchWebviewRef) {
      refetchWebviewRef.current = () => {
        setLoading(true);
        webViewRef?.current?.reload();
        setTimeout(
          () => {
            setRefreshing(false);
            setTimeout(() => setLoading(false), 300);
          },
          Platform?.OS === 'ios' ? 500 : 1000
        );
      };
    }
  }, [refetchWebviewRef]);

  // webViewRef.current?.postMessage('refetch_from_app');

  const [refreshing, setRefreshing] = useState(false);
  const [refresherEnabled, setEnableRefresher] = useState(true);
  const handleScroll = useCallback((event: any) => {
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
    webViewRef?.current?.reload();
    setTimeout(
      () => {
        setRefreshing(false);
        setTimeout(() => setLoading(false), Platform?.OS === 'ios' ? 150 : 250);
      },
      Platform?.OS === 'ios' ? 500 : 1000
    );
  }, []);
  // const { top } = useSafeAreaInsets();

  const onShouldStartLoadWithRequest = useCallback(
    (event: ShouldStartLoadRequest) => {
      if (
        event.url.includes('painstorm-push-noti.dowon938.workers.dev/image?')
      ) {
        openImageViewer({ url: event.url });
        return false;
      }
      // console.log('onShouldStartLoadWithRequest\n', event.url, '\n');
      //임베디드된 위젯 아니고 트레이딩 뷰 url인경우 웹뷰로 띄워줌
      if (
        !event.url.includes('s.tradingview.com/widgetembed') &&
        event.url.includes('tradingview')
      ) {
        // processURL({ url: event.url, navigation });
        return false;
      } else {
        return true;
      }
    },
    []
  );

  const pullToRefreshEnabled = topDimmingOn ? false : pullToRefreshEnabledProp;

  const [ready, setReady] = useState(false);
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      setReady(true);
    });
  }, []);

  const commonWebViewProps = useMemo(() => {
    return {
      ref: webViewRef,
      textZoom: 100,
      originWhitelist,
      source,
      javaScriptEnabled: true,
      injectedJavaScript: getNavigationStateScript,
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
      cacheEnabled: ready,
      incognito: false,
      cacheMode: ready
        ? ('LOAD_CACHE_ELSE_NETWORK' as CacheMode)
        : ('LOAD_NO_CACHE' as CacheMode),
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
    };
  }, [
    getNavigationStateScript,
    handlePostMessage,
    onContentProcessDidTerminate,
    onShouldStartLoadWithRequest,
    pullToRefreshEnabled,
    ready,
    source,
  ]);

  const IosWrapper = useMemo(
    () => (withIOSKeyboardAvoiding ? CommonKeyboardAvoiding : Fragment),
    [withIOSKeyboardAvoiding]
  );

  if (Platform?.OS === 'android') {
    return (
      <>
        {/* <TopDimmingView top={topDimmingOn ? top : 0} /> */}
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
            {loading && CustomLoadingView && (
              <Animated.View exiting={FadeOut} style={styles.progressWrapper}>
                <CustomLoadingView />
              </Animated.View>
            )}
          </ScrollView>
        </CommonKeyboardAvoiding>
      </>
    );
  }

  return (
    <>
      {/* <TopDimmingView top={topDimmingOn ? top : 0} /> */}
      <IosWrapper>
        <WebView
          style={styles.styledWebView}
          {...commonWebViewProps}
          onLoadProgress={onLoadProgress}
          pullToRefreshEnabled={pullToRefreshEnabled}
        />
        {loading && CustomLoadingView && (
          <Animated.View exiting={FadeOut} style={styles.progressWrapper}>
            <CustomLoadingView />
          </Animated.View>
        )}
      </IosWrapper>
      <IOSScrollToTop
        onStatusBarClicked={() => {
          webViewRef?.current?.injectJavaScript(
            `window.scrollTo({top:0, left:0, behavior: "smooth"});
document.querySelector('.rn-scroll-to-top')?.scrollTo({top: 0, left:0, behavior: 'smooth'});`
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
    prev?.withIOSKeyboardAvoiding === cur?.withIOSKeyboardAvoiding
  );
};

export default memo(CommonWebview, areEqual);
