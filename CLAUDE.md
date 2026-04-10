# pain-storm-wod-checker

Expo/React Native 앱. `record`/`wod`/`location` 3개 탭을 각각 별도의 WebView 인스턴스로
`pain-storm-wod-web`을 로드한다. WebView들은 탭 간 persistent하며, 공통 래퍼는
`components/ui/CommonWebview.tsx`.

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
