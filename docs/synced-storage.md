# synced-storage

웹(Next.js, `pain-storm-wod-web`)과 앱(Expo, `pain-storm-wod-checker`) 간에
설정 값을 양방향으로 자동 동기화하는 범용 string 키-값 스토리지 레이어.

첫 번째 소비자는 `perferBranch`(지점 선택)지만, 다른 값도 웹 측 `SYNCED_KEYS`에 키만 추가하면
동일한 방식으로 동기화된다. 새로운 기능마다 메시지 타입과 브로드캐스트 코드를
따로 작성할 필요가 없다.

**앱 배포가 필요 없다.** 앱은 allowlist를 두지 않고 웹에서 오는 모든 키를 그대로 저장·주입한다.
따라서 새 키는 웹 쪽 한 줄 추가와 웹 배포만으로 완결된다.

---

## 왜 필요했나

- 앱은 `record`/`wod`/`location` 3개 탭을 **각각 별도 WebView 인스턴스**로 띄운다.
- 각 WebView는 자체 localStorage를 가지므로, 한 탭에서 지점을 바꿔도 다른 탭에는 반영되지 않았다.
- 앱에도 네이티브 `BranchSelector`가 있지만, 그 값은 웹뷰에 전달되지 않았다.
- 이 세 가지 영역(네이티브 UI / 3개 웹뷰 각각 / MMKV)이 서로 단절되어 있었다.

## 아키텍처 한 문단

**앱 MMKV를 진실 소스**로 두고, 등록된 모든 WebView의 localStorage를 미러로 사용한다.
어느 쪽에서 값이 바뀌든 앱 허브를 거쳐 다른 모든 WebView로 브로드캐스트된다.
웹 단독 환경(브라우저)에서는 `window.ReactNativeWebView`가 없으므로 일반 localStorage처럼 동작한다.

```
┌─────────────────────────┐
│ 앱 MMKV (진실 소스)      │
│  lib/synced-storage.ts  │
└────────┬────────────────┘
         │ setSyncedItem(key, value, sourceRef?)
         │
         ├── broadcastSyncedStorageSet(…, except=sourceRef)
         │     ↓  injectJavaScript("window.__applySyncedStorage(…)")
         │
    ┌────┴─────┬─────────────┬─────────────┐
    ↓          ↓             ↓             ↓
 WebView #1  WebView #2  WebView #3   네이티브 UI
 (/record)   (/wod)      (/location)  (BranchSelector 등)
    │          │             │
    │ 값이 바뀌면: postMessage(SYNCED_STORAGE_SET)
    └──────────┴─────────────┘
                 ↑
            앱 onMessage 핸들러 → setSyncedItem(…, source=이 웹뷰)
```

## 파일 레이아웃

| 레포 | 경로 | 역할 |
|---|---|---|
| app | `lib/synced-storage.ts` | MMKV 허브, 브로드캐스트, `useSyncedStorage` 훅 |
| app | `lib/webview-registry.ts` | 활성 WebView ref 등록/해제, 스크립트 주입 유틸 |
| app | `components/ui/CommonWebview.tsx` | ref 등록, `injectedJavaScriptBeforeContentLoaded` 초기 주입, `SYNCED_STORAGE_SET/REMOVE` 메시지 핸들링 |
| web | `src/lib/synced-storage.ts` | localStorage 미러, `useSyncedStorage` 훅, 모듈 로드 시 자동 브리지 설치 |
| web | `src/types/webview.d.ts` | `window.__*` 전역 + `RNMessage` 유니온 확장 |

## 프로토콜

### 1. 초기 주입 (앱 → 웹, 페이지 로드 직전)

앱 측 `CommonWebview`가 `injectedJavaScriptBeforeContentLoaded`로 다음을 주입:

```js
window.__initialSyncedStorage = {'perferBranch':'APGUJEONG', /* … */};
```

웹 측 `synced-storage.ts`는 모듈 로드 즉시 `installSyncedStorageBridge()`가 실행되어
`__initialSyncedStorage`를 읽어 localStorage에 덮어쓴다(앱이 진실 소스이므로).

### 2. 런타임 동기화 메시지

**웹 → 앱** (`window.ReactNativeWebView.postMessage`):
```json
[{"type":"SYNCED_STORAGE_SET","params":{"key":"perferBranch","value":"APGUJEONG"}}]
[{"type":"SYNCED_STORAGE_REMOVE","params":{"key":"perferBranch"}}]
```

앱 `CommonWebview.handlePostMessage`가 이를 받아 `setSyncedItem(key, value, sourceRef)`
호출. source가 자기 자신이므로 자기 자신에게는 다시 브로드캐스트하지 않는다.

**앱 → 웹** (`webViewRef.injectJavaScript`):
```js
window.__applySyncedStorage('perferBranch', 'APGUJEONG'); true;
```

웹 측 `__applySyncedStorage`는 localStorage + 구독자만 갱신하고 RN으로 되돌려 보내지 않는다
(echo 방지).

## Echo/루프 방지 3단 가드

1. **Prev equality no-op** — 양쪽 `setSyncedItem`/`applySyncedItem` 모두 이전 값과 같으면 즉시 리턴.
2. **내부 세터 분리** — 앱이 주입할 때 쓰는 `window.__applySyncedStorage`는 postMessage를 보내지 않는다. 사용자 행동에서 쓰는 `setSyncedItem`만 postMessage를 보낸다.
3. **Source 제외 브로드캐스트** — 앱 `setSyncedItem(key, value, sourceRef)`는 레지스트리에서 `sourceRef === ref`인 WebView는 스킵한다. 웹→앱 경로에서 소스 웹뷰에 값이 즉시 돌아가지 않는다.

## 새 키 추가하기

### 웹에서만 추가 (앱 배포 불필요) — 기본 경로

1. **웹 `SYNCED_KEYS`에 문자열 추가**
   - `pain-storm-wod-web/src/lib/synced-storage.ts`

   ```ts
   export const SYNCED_KEYS = ['perferBranch', 'theme'] as const;
   ```

2. **웹 컴포넌트에서 훅 사용**

   ```ts
   const [theme, setTheme] = useSyncedStorage('theme', { serverValue: 'light' });
   ```

3. 끝. 웹만 배포하면 된다. 앱은 `'theme'` 키를 모르지만, 웹에서 오는 `SYNCED_STORAGE_SET` 메시지를 그대로 전용 MMKV에 저장하고 부팅 시 `getAllKeys()`로 덤프해 주입하므로 여러 웹뷰/앱 재시작 간 완전히 동기화된다.

### 앱에서도 네이티브 UI로 이 값을 쓰고 싶다면 (선택)

앱 측 네이티브 컴포넌트에서 `useSyncedStorage('theme', { defaultValue: 'light' })`를 호출하면 된다. 별도 등록 절차 없음. 단, 이 경우에는 앱 코드가 바뀌므로 앱 배포가 필요하다(네이티브 UI 변경이므로 당연).

## 제약과 설계 결정

- **String only** — localStorage가 string만 저장하므로 synced-storage도 string 전용이다. 객체를 동기화해야 하면 호출자가 `JSON.stringify`/`parse`를 담당.
- **진실 소스는 앱** — 주입값이 localStorage를 덮어쓴다. 웹에서 오프라인으로 바꾼 값은 다음 웹뷰 reload 시 앱 값으로 대체될 수 있다. 동기화 중인 키는 앱을 거치므로 보통 문제가 없다.
- **앱 MMKV는 전용 인스턴스** — `new MMKV({ id: 'synced-storage' })`. 기본 MMKV에 있는 다른 앱 데이터가 초기 주입에 섞이지 않도록 격리되어 있어야, 부팅 시 `getAllKeys()`로 전부 덤프해 웹에 주입할 수 있다. 이 격리가 "앱 배포 없이 웹에서만 키 추가" 설계의 핵심이다.
- **레거시 마이그레이션** — 이전 네이티브 `BranchSelector`는 기본 MMKV에 `perferBranch`를 직접 저장했다. 모듈 로드 시 1회 `migrateFromLegacyStorage()`가 실행되어 전용 인스턴스로 값을 옮긴다. `LEGACY_KEYS` 배열에 추가하면 필요에 따라 다른 레거시 키도 함께 이관할 수 있다.
- **앱은 allowlist 없음** — 앱은 웹이 보내는 어떤 키든 그대로 저장/브로드캐스트한다. 웹에서만 allowlist(`SYNCED_KEYS`)를 유지해 타입 안전성과 "의도된 sync 대상"을 관리한다. 덕분에 새 키 추가가 웹 배포만으로 완결된다.
- **브라우저 단독 사용** — `window.ReactNativeWebView`가 없으면 `postToNative`는 무해하게 skip되고 일반 localStorage처럼 동작한다.
- **Pull-to-refresh / WebView reload** — 앱 측은 `useSyncedStorageSnapshot`을 구독해 리렌더될 때 `injectedJavaScriptBeforeContentLoaded` prop을 최신 스냅샷으로 갱신한다. 따라서 reload 이후에도 최신값이 초기 주입된다.

## 트러블슈팅

- **웹뷰에서 바꿨는데 다른 탭에 반영 안 됨** — 앱 `onMessage`가 `SYNCED_STORAGE_SET`을 받는지 확인. `CONSOLE` 로그 타입이 이미 있으므로 웹에서 postMessage 직전에 찍어보면 된다.
- **앱 재시작 후 초기값이 기본값으로 돌아옴** — MMKV에 저장되는지 확인(`storage.getString(key)`). `setSyncedItem` 경로로만 써야 한다.
- **SSR 하이드레이션 미스매치** — 웹 훅은 `serverValue`를 받는다. 서버 렌더와 동일한 기본값을 넘겨야 한다.
- **값이 두 번 반영됨(echo)** — 앱에서 `setSyncedItem` 호출 시 source를 넘기고 있는지 확인. 네이티브 UI 변경에서는 source 없이 호출(모든 웹뷰로 전파). 웹→앱 핸들러에서는 source를 자기 ref로 넘겨야 한다.
