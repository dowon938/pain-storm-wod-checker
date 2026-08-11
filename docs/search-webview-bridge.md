# 검색 WebView (네이티브 ↔ 웹)

> **변경 이력**: 예전엔 네이티브가 검색 입력창·지점 칩·닫기 버튼을 소유하고
> `window.PainstormSearch.onInput` / `SEARCH_WEB_READY` / `SEARCH_SET_QUERY` /
> `SEARCH_DISMISS_KEYBOARD` 브릿지로 웹에 값을 주입했다. **이 브릿지는 전부 제거됐다.**
> 지금은 입력 UI와 진입 애니메이션까지 **웹이 전부 소유**한다.

## 역할 분담

- **네이티브(`app/search.tsx`)**: 웹뷰를 전체 화면으로 깔아주는 껍데기.
  스택 전환 애니메이션(`fade_from_bottom`)과 제스처만 담당한다.
- **웹(`pain-storm-wod-web` `/search`)**: 제목, 최근검색, 결과 리스트, 상세 진입,
  그리고 **검색 입력창 / 지점 필터 칩 / 닫기(X) 버튼 / 진입 애니메이션**까지 전부.
  - 입력 바: `src/components/search/SearchInputBar.tsx`
  - 진입 애니메이션 키프레임: `src/app/globals.css`의 `search-*`

일반 브라우저에서 열어도 그대로 동작한다(닫기는 `history.back()`으로 폴백).

## 로드 URL

```
GET {WEB_BASE}/search
```
- prod: `https://painstorm-nextjs.vercel.app/search`
- iOS 시뮬레이터(dev): `http://localhost:3000/search`

## 네이티브가 여전히 해줘야 하는 것

`CommonWebview`에 **`webKeyboardInput`** prop을 넘긴다. 이게 켜지면:

| WebView prop | 값 | 이유 |
| --- | --- | --- |
| `keyboardDisplayRequiresUserAction` | `false` | 웹 인풋의 `autoFocus`로 키보드가 뜨게 허용(iOS 기본값은 사용자 탭 필요) |
| `hideKeyboardAccessoryView` | `true` | iOS 키보드 위 이전/다음/완료 바 제거 |

키보드를 피해 입력 바를 올리는 건 **웹이 `visualViewport`로 처리**한다.
안드로이드는 `windowSoftInputMode=adjustResize`라 웹뷰 자체가 줄어들어 자동으로 맞는다.

## 웹 → 네이티브 (공용 메시지만 사용)

검색 전용 메시지는 없다. 기존 공용 브릿지를 그대로 쓴다.

- 결과 탭 → 상세: `DEEP_LINK` (`/search/detail?date=&branch=`) → `/webview` 네이티브 스택 push
- 닫기(X) 버튼: `GO_BACK` → 스택 pop
- 햅틱: `SOFT_HAPTIC_FEEDBACK`
- 선호지점 초기값: `synced-storage`의 `perferBranch`(웹이 직접 읽음). 지점 칩을
  바꿔도 전역 설정은 안 바꾸는 **로컬 검색 스코프**다.

## 데이터

검색 API 명세는 **pain-storm-wod-web `docs/search-api.md`** 참고
(`/search.json`, `/day.json`, 지점 단위 + `matches` 하이라이팅).

- `branch === 'ALL'`이면 `/search.json`의 `branch` 파라미터 생략(전체 검색).
- 지점 코드 매핑: `record01`=압구정, `record03`=잠실, `record04`=수원, `record05`=아차산.
