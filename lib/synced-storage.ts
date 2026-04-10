import { useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

import {
  broadcastSyncedStorageRemove,
  broadcastSyncedStorageSet,
  type WebViewRefLike,
} from './webview-registry';

/**
 * synced-storage (앱 허브)
 *
 * 앱 MMKV를 진실 소스로 두고, 등록된 모든 WebView의 localStorage와
 * 양방향으로 동기화되는 범용 string 키-값 저장소.
 *
 * **앱 배포 없이 웹에서만 새 키를 추가할 수 있다.**
 * 이 모듈은 어떤 키도 allowlist로 막지 않는다. 웹이 `SYNCED_STORAGE_SET`으로
 * 전달한 키는 전용 MMKV 인스턴스에 그대로 저장되고, 부팅 시 `getAllKeys()`로
 * 전부 주입된다. 네이티브 UI는 원하는 키를 `useSyncedStorage('key')`로 직접 구독하면 된다.
 *
 * 아키텍처/프로토콜/새 키 추가 가이드: docs/synced-storage.md
 */

// synced-storage 전용 MMKV 인스턴스.
// 별도 id를 써서 기본 MMKV에 있는 다른 앱 데이터가 초기 주입에 섞이지 않도록 격리한다.
const storage = new MMKV({ id: 'synced-storage' });

/**
 * 기존 기본 MMKV에 저장돼 있던 perferBranch 값을 전용 인스턴스로 옮기는 1회성 마이그레이션.
 * 이전 빌드에서 네이티브 BranchSelector가 `new MMKV()` (기본 인스턴스)에 직접 저장해 왔다.
 * 앱 업데이트 후 첫 모듈 로드 시 한 번 실행되고, 이후에는 전용 인스턴스에 값이 있으므로 no-op.
 */
const LEGACY_KEYS = ['perferBranch'] as const;
const migrateFromLegacyStorage = () => {
  try {
    const legacy = new MMKV();
    for (const key of LEGACY_KEYS) {
      if (storage.contains(key)) continue;
      const legacyValue = legacy.getString(key);
      if (legacyValue === undefined) continue;
      storage.set(key, legacyValue);
      legacy.delete(key);
    }
  } catch {
    // 마이그레이션 실패는 치명적이지 않음 — 사용자가 다시 선택하면 된다.
  }
};
migrateFromLegacyStorage();

type Listener = (value: string | null) => void;
const listeners = new Map<string, Set<Listener>>();

const getListenerSet = (key: string): Set<Listener> => {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  return set;
};

const notify = (key: string, value: string | null) => {
  listeners.get(key)?.forEach((listener) => listener(value));
  snapshotListeners.forEach((listener) => listener());
};

const readRaw = (key: string): string | null => {
  const value = storage.getString(key);
  return value === undefined ? null : value;
};

export const readSyncedItem = (key: string): string | null => readRaw(key);

/**
 * synced-storage에 값 쓰기.
 * - 전용 MMKV 저장
 * - 앱 내부 구독자 알림
 * - 레지스트리의 다른 모든 WebView로 브로드캐스트 (source 제외)
 *
 * @param sourceWebView 이 변경을 발생시킨 웹뷰 ref. 브로드캐스트에서 제외된다.
 *                      웹→앱 메시지 핸들러에서 호출할 때 넘기면 echo 루프를 방지할 수 있다.
 *                      네이티브 UI에서 호출할 때는 생략한다(모든 웹뷰로 전파).
 */
export const setSyncedItem = (
  key: string,
  value: string,
  sourceWebView?: WebViewRefLike | null,
): void => {
  const prev = readRaw(key);
  if (prev === value) return;
  storage.set(key, value);
  invalidateSnapshotCache();
  notify(key, value);
  broadcastSyncedStorageSet(key, value, sourceWebView);
};

export const removeSyncedItem = (
  key: string,
  sourceWebView?: WebViewRefLike | null,
): void => {
  const prev = readRaw(key);
  if (prev === null) return;
  storage.delete(key);
  invalidateSnapshotCache();
  notify(key, null);
  broadcastSyncedStorageRemove(key, sourceWebView);
};

let cachedSnapshot: Record<string, string> | null = null;

const computeSnapshot = (): Record<string, string> => {
  const snapshot: Record<string, string> = {};
  for (const key of storage.getAllKeys()) {
    const value = storage.getString(key);
    if (value !== undefined) snapshot[key] = value;
  }
  return snapshot;
};

const invalidateSnapshotCache = () => {
  cachedSnapshot = null;
};

/**
 * 현재 전용 MMKV 스냅샷을 dict로 반환한다.
 * 값이 바뀌기 전까지 동일한 참조를 반환하므로 useSyncExternalStore 스냅샷으로 안전하게 사용 가능.
 */
export const getSyncedStorageSnapshot = (): Record<string, string> => {
  if (cachedSnapshot === null) cachedSnapshot = computeSnapshot();
  return cachedSnapshot;
};

const escapeForJsString = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

/**
 * 웹뷰에 주입할 초기 스냅샷 설정 스크립트를 생성한다.
 * 전용 MMKV에 저장된 모든 키를 그대로 덤프한다 → 앱 코드 수정 없이 웹에서 추가한 키도 주입된다.
 */
export const buildInitialSyncedStorageScript = (): string => {
  const snapshot = getSyncedStorageSnapshot();
  const entries = Object.entries(snapshot)
    .map(([k, v]) => `'${escapeForJsString(k)}':'${escapeForJsString(v)}'`)
    .join(',');
  return `window.__initialSyncedStorage = {${entries}}; true;`;
};

const subscribe = (key: string, listener: Listener): (() => void) => {
  const set = getListenerSet(key);
  set.add(listener);
  return () => {
    set.delete(listener);
  };
};

const snapshotListeners = new Set<() => void>();
const subscribeAll = (listener: () => void): (() => void) => {
  snapshotListeners.add(listener);
  return () => {
    snapshotListeners.delete(listener);
  };
};

/**
 * 현재 스냅샷을 구독하는 훅. 어떤 키가 바뀌어도 리렌더를 일으킨다.
 */
export const useSyncedStorageSnapshot = (): Record<string, string> =>
  useSyncExternalStore(subscribeAll, getSyncedStorageSnapshot);

/**
 * 네이티브 React 컴포넌트용 훅. 현재 값과 세터를 반환한다.
 * 값 변경은 모든 웹뷰로 자동 브로드캐스트된다.
 */
export function useSyncedStorage(
  key: string,
): [string | null, (value: string) => void];
export function useSyncedStorage(
  key: string,
  options: { defaultValue: string },
): [string, (value: string) => void];
export function useSyncedStorage(
  key: string,
  options?: { defaultValue?: string },
) {
  const value = useSyncExternalStore(
    (listener) => subscribe(key, () => listener()),
    () => readRaw(key) ?? options?.defaultValue ?? null,
  );
  const setter = (next: string) => setSyncedItem(key, next);
  return [value, setter] as const;
}
