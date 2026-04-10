import type { MutableRefObject, RefObject } from 'react';
import type WebView from 'react-native-webview';

/**
 * 앱 내 활성 WebView 인스턴스들의 중앙 레지스트리.
 *
 * CommonWebview가 마운트/언마운트 시 자신의 ref를 register/unregister 한다.
 * synced-storage가 값을 바꿀 때 이 레지스트리를 통해 다른 모든 웹뷰로
 * injectJavaScript를 통해 브로드캐스트한다.
 */

export type WebViewLike = Pick<WebView, 'injectJavaScript'>;
export type WebViewRefLike =
  | RefObject<WebViewLike | null>
  | MutableRefObject<WebViewLike | null>;

const registry = new Set<WebViewRefLike>();

export const registerWebView = (ref: WebViewRefLike): (() => void) => {
  registry.add(ref);
  return () => {
    registry.delete(ref);
  };
};

const escapeForJsString = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const buildApplyScript = (key: string, value: string): string =>
  `window.__applySyncedStorage && window.__applySyncedStorage('${escapeForJsString(
    key,
  )}', '${escapeForJsString(value)}'); true;`;

const buildRemoveScript = (key: string): string =>
  `window.__removeSyncedStorage && window.__removeSyncedStorage('${escapeForJsString(
    key,
  )}'); true;`;

const forEachRef = (
  except: WebViewRefLike | null | undefined,
  fn: (webview: WebViewLike) => void,
) => {
  registry.forEach((ref) => {
    if (ref === except) return;
    const wv = ref.current;
    if (!wv) return;
    try {
      fn(wv);
    } catch {
      // 개별 웹뷰 주입 실패는 나머지 웹뷰에 영향 주지 않음
    }
  });
};

/**
 * 레지스트리의 모든 WebView(`except` 제외)로 synced-storage SET을 주입한다.
 */
export const broadcastSyncedStorageSet = (
  key: string,
  value: string,
  except?: WebViewRefLike | null,
): void => {
  const script = buildApplyScript(key, value);
  forEachRef(except, (wv) => wv.injectJavaScript(script));
};

/**
 * 레지스트리의 모든 WebView(`except` 제외)로 synced-storage REMOVE를 주입한다.
 */
export const broadcastSyncedStorageRemove = (
  key: string,
  except?: WebViewRefLike | null,
): void => {
  const script = buildRemoveScript(key);
  forEachRef(except, (wv) => wv.injectJavaScript(script));
};
