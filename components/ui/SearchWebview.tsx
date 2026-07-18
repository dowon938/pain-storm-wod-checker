import { isDevice } from 'expo-device';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Platform, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview/lib/WebViewTypes';

const BASE =
  Platform.OS === 'ios' && !isDevice
    ? 'http://localhost:3000'
    : 'https://painstorm-nextjs.vercel.app';

// 브릿지 프로토콜: docs/search-webview-bridge.md
const SEARCH_PATH = '/search';

export type SearchWebviewHandle = {
  /** 검색 제출(엔터) 알림 — 웹이 최근검색 저장 등에 사용 */
  submit: () => void;
};

type Props = {
  /** 검색어(원문). 매 변경 시 웹으로 전달 */
  query: string;
  /** 지점 필터: 'ALL' | 지점명(압구정/잠실/수원/아차산) */
  branch: string;
  /** 웹에서 최근검색 탭 등으로 검색어를 바꾸려 할 때(네이티브 입력값 반영) */
  onSetQuery?: (q: string) => void;
};

/**
 * 검색 결과/최근검색/상세를 렌더하는 웹(pain-storm-wod-web `/search`) 표시 전용 WebView.
 * 입력(검색어)·지점은 네이티브가 소유하고, 이 컴포넌트가 injectJavaScript로 웹에 push한다.
 * 웹이 준비되면 SEARCH_WEB_READY 메시지를 보내고, 그 시점에 현재 상태를 flush한다.
 */
export const SearchWebview = forwardRef<SearchWebviewHandle, Props>(
  function SearchWebview({ query, branch, onSetQuery }, ref) {
    const webRef = useRef<WebView>(null);
    const readyRef = useRef(false);
    // 항상 최신 값을 참조(ready flush / submit에서 사용)
    const latest = useRef({ query, branch });
    latest.current = { query, branch };

    const send = useCallback(
      (payload: { q: string; branch: string; submit?: boolean }) => {
        if (!readyRef.current) return; // ready 전이면 무시 → ready 시 flush로 반영
        const js = `window.PainstormSearch && window.PainstormSearch.onInput(${JSON.stringify(
          payload,
        )}); true;`;
        webRef.current?.injectJavaScript(js);
      },
      [],
    );

    // 검색어/지점 변경 시 웹으로 전달
    useEffect(() => {
      send({ q: query, branch });
    }, [query, branch, send]);

    useImperativeHandle(
      ref,
      () => ({
        submit: () =>
          send({
            q: latest.current.query,
            branch: latest.current.branch,
            submit: true,
          }),
      }),
      [send],
    );

    const onMessage = useCallback(
      (e: WebViewMessageEvent) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data);
          if (msg?.type === 'SEARCH_WEB_READY') {
            readyRef.current = true;
            send({ q: latest.current.query, branch: latest.current.branch });
          } else if (
            msg?.type === 'SEARCH_SET_QUERY' &&
            typeof msg.q === 'string'
          ) {
            onSetQuery?.(msg.q);
          }
        } catch {
          // 검색 브릿지와 무관한 메시지는 무시
        }
      },
      [send, onSetQuery],
    );

    return (
      <WebView
        ref={webRef}
        source={{ uri: `${BASE}${SEARCH_PATH}` }}
        style={styles.web}
        onMessage={onMessage}
        originWhitelist={['*']}
        overScrollMode='never'
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView
        allowsBackForwardNavigationGestures={false}
      />
    );
  },
);

const styles = StyleSheet.create({
  web: {
    flex: 1,
    backgroundColor: 'black',
  },
});
