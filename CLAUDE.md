# pain-storm-wod-checker

Expo/React Native 앱. `record`/`wod`/`location` 3개 탭을 각각 별도의 WebView 인스턴스로
`pain-storm-wod-web`을 로드한다. WebView들은 탭 간 persistent하며, 공통 래퍼는
`components/ui/CommonWebview.tsx`.

## 화면 공통 규칙: safe-area

**모든 화면은 항상 safe-area(상단 노치/상태바, 하단 홈 인디케이터)를 처리한다.** 새 화면을
만들거나 기존 화면을 수정할 때 빠뜨리지 말 것.

- 네이티브 화면 셸: `useSafeAreaInsets()`로 top/bottom inset을 반영한다.
- WebView 화면: `CommonWebview`가 `window.__safeArea = { top, bottom }`를 자동 주입하고
  값 변경 시 `safe-area-update` 이벤트를 쏜다. 웹은 `useSafeArea()`로 읽어 처리하므로
  **새 WebView 화면을 추가해도 앱 쪽에서 별도 작업은 필요 없다** — 웹에서 반영하면 된다.
- 새 네이티브 스택 화면(예: `/webview`)을 추가할 때 상단을 이미 오프셋하는지 확인해
  웹과 **이중 여백**이 생기지 않게 한다.

## 웹→앱 딥링크 (범용 /webview 스택)

웹 내부 경로를 네이티브 스택으로 열 때는 기능별 라우트/메시지를 만들지 말고 **범용
`DEEP_LINK`** 를 쓴다. 웹이 `[{ type: 'DEEP_LINK', params: { deeplinkUrl: '/내부경로' } }]`를
보내면 `CommonWebview`의 `DEEP_LINK` 핸들러가 `router.push({ pathname: '/webview',
params: { path } })`로 **범용 `app/webview.tsx`** 를 열어 그 경로를 새 WebView로 로드한다.
뒤로가기는 웹이 `[{ type: 'GO_BACK' }]`를 보내면 `navigation.goBack()`으로 pop.
(예: 검색 결과 탭 → `/search/detail?date=&branch=`)

## 웹 ↔ 앱 상태 동기화 (synced-storage)

설정 값(지점 선택, 테마 등)을 앱 MMKV와 3개 WebView의 localStorage 사이에
자동으로 양방향 동기화할 때는 **반드시** 기존의 범용 `synced-storage` 레이어를 사용한다.
기능별로 새 `onMessage` 핸들러나 inject 스크립트를 만들지 않는다.

- **진입점**: `lib/synced-storage.ts`
- **WebView 레지스트리**: `lib/webview-registry.ts`
- **WebView 통합**: `components/ui/CommonWebview.tsx`가 마운트 시 ref를 등록하고
  `SYNCED_STORAGE_SET/REMOVE` 메시지를 핸들링한다.
- **네이티브 훅**: `useSyncedStorage(key, { defaultValue })` — 네이티브 UI가 같은 값을 쓰려면 이 훅 사용.
- **상세 문서**: [`docs/synced-storage.md`](./docs/synced-storage.md)
  (웹 레포에도 동일한 문서가 있다: `pain-storm-wod-web/docs/synced-storage.md`)

### 핵심 설계 포인트

- **앱은 allowlist를 두지 않는다.** 웹에서 오는 모든 키를 전용 MMKV(`new MMKV({ id: 'synced-storage' })`)에
  그대로 저장하고, 부팅 시 `getAllKeys()`로 전부 초기 주입한다.
  → **새 키 추가는 웹에서만 하면 되고 앱 배포가 필요 없다.**
- 앱 네이티브 UI에서도 같은 값을 쓰고 싶을 때만 앱 코드가 바뀌므로 앱 배포가 필요하다(당연).
- 전용 MMKV 인스턴스를 쓰는 이유는 기본 MMKV에 있는 다른 앱 데이터가 초기 주입에 섞이지 않도록 격리하기 위함이다.
- 레거시 `perferBranch`(기본 MMKV에 직접 저장돼 있던 값)는 모듈 로드 시 1회 `migrateFromLegacyStorage()`가 전용 인스턴스로 이관한다.

### 안티패턴 (하지 말 것)

- 직접 `storage.set(...)` 호출 (`new MMKV()`) — 대신 `setSyncedItem` 또는 `useSyncedStorage` 훅 사용.
- 새 설정 값마다 `CommonWebview.onMessage`에 커스텀 메시지 타입 케이스 추가 — 대신 웹에서 `SYNCED_KEYS`에 추가.
- 새 설정 값을 위해 별도의 `injectJavaScript`를 직접 호출 — synced-storage가 자동으로 브로드캐스트한다.
