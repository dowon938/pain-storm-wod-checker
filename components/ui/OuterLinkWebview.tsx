import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import {
  ShouldStartLoadRequest,
  WebViewNavigation,
  WebViewProgressEvent,
} from 'react-native-webview/lib/WebViewTypes';

import { hapticLight } from '@/hooks/haptic';

type Props = { url: string };

const EXTERNAL_SCHEMES = [
  'tel:',
  'mailto:',
  'sms:',
  'itms-apps:',
  'market:',
  'intent:',
];

const hostOf = (u: string) => {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
};

const isHttps = (u: string) => {
  try {
    return new URL(u).protocol === 'https:';
  } catch {
    return false;
  }
};

const OuterLinkWebview = ({ url }: Props) => {
  const { top } = useSafeAreaInsets();
  const navigation = useNavigation();
  const webViewRef = useRef<WebView | null>(null);

  const [currentUrl, setCurrentUrl] = useState(url);
  const [progress, setProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const canGoBackRef = useRef(false);

  const onNavigationStateChange = useCallback((e: WebViewNavigation) => {
    setCurrentUrl(e.url);
    setCanGoBack(e.canGoBack);
    canGoBackRef.current = e.canGoBack;
  }, []);

  const onLoadProgress = useCallback((e: WebViewProgressEvent) => {
    setProgress(e.nativeEvent.progress);
  }, []);

  const onShouldStartLoadWithRequest = useCallback(
    (event: ShouldStartLoadRequest) => {
      if (EXTERNAL_SCHEMES.some((s) => event.url.startsWith(s))) {
        Linking.openURL(event.url).catch(() => {});
        return false;
      }
      return true;
    },
    [],
  );

  const close = useCallback(() => {
    hapticLight();
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const reload = useCallback(() => {
    hapticLight();
    webViewRef.current?.reload();
  }, []);

  const openExternal = useCallback(() => {
    hapticLight();
    Linking.openURL(currentUrl).catch(() => {});
  }, [currentUrl]);

  const handleBack = useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackRef.current) {
        webViewRef.current?.goBack();
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      }
      return true;
    });
    return () => sub.remove();
  }, [navigation]);
  useFocusEffect(handleBack);

  const host = useMemo(() => hostOf(currentUrl), [currentUrl]);
  const secure = useMemo(() => isHttps(currentUrl), [currentUrl]);
  const loading = progress > 0 && progress < 1;

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === 'ios' ? 16 : top },
        ]}
      >
        <Pressable
          onPress={close}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityLabel='close'
        >
          <Ionicons name='close' size={26} color='#fff' />
        </Pressable>
        <View style={styles.titleWrap}>
          <View style={styles.hostRow}>
            {secure && (
              <Ionicons
                name='lock-closed'
                size={11}
                color='#8f8f8f'
                style={styles.lock}
              />
            )}
            <Text numberOfLines={1} style={styles.host}>
              {host}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={reload}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityLabel='reload'
        >
          <Ionicons name='reload' size={20} color='#fff' />
        </Pressable>
        <Pressable
          onPress={openExternal}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityLabel='open-external'
        >
          <Ionicons name='open-outline' size={22} color='#fff' />
        </Pressable>
      </View>
      {loading && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction
        allowsInlineMediaPlayback
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
        setSupportMultipleWindows={false}
        onNavigationStateChange={onNavigationStateChange}
        onLoadProgress={onLoadProgress}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onContentProcessDidTerminate={() => webViewRef.current?.reload()}
        onRenderProcessGone={() => webViewRef.current?.reload()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1C1C1E' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  hostRow: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%' },
  lock: { marginRight: 4 },
  host: { color: '#F2F2F7', fontSize: 13, fontWeight: '500' },
  progressTrack: { height: 2, backgroundColor: '#2C2C2E' },
  progressFill: { height: 2, backgroundColor: '#0A84FF' },
  webview: { flex: 1, backgroundColor: '#FFFFFF' },
});

export default OuterLinkWebview;
