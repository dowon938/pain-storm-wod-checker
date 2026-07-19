# 검색 WebView 브릿지 계약 (네이티브 ↔ 웹)

앱의 **검색 화면**은 하이브리드다.

- **네이티브(pain-storm-wod-checker)**: 화면 셸만 담당 — 하단 **검색 입력창**, **지점 필터 칩 바**, **닫기(X) 버튼**, 진입 애니메이션.
- **웹(pain-storm-wod-web)**: `/search` 라우트가 **컨텐츠 전체**를 렌더 — 제목, 최근검색, 검색 결과 리스트, 결과 탭 시 상세(WOD + 지점 기록). 기존 WOD 카드/스타일 재사용.

입력·지점은 **네이티브가 소유**하고, 네이티브가 WebView에 주입해 웹을 구동한다. 웹은 **자체 검색 입력창/지점 셀렉터를 렌더하지 않는다.**

- 웹 데이터 소스는 기존 검색 API 명세를 그대로 사용: **pain-storm-wod-web `docs/search-api.md`** (`/search.json`, `/day.json`, 지점 단위 + `matches` 하이라이팅).
- 네이티브 WebView 구현: `components/ui/CommonWebview.tsx`(`search` prop으로 활성화), 화면: `app/search.tsx`.

---

## 1. 로드 URL

```
GET {WEB_BASE}/search
```
- prod: `https://painstorm-nextjs.vercel.app/search`
- iOS 시뮬레이터(dev): `http://localhost:3000/search`

이 라우트는 **WebView 전용**이다(일반 브라우저 접근 상정 안 함). 네이티브 브릿지가 없으면(=일반 브라우저) 입력이 안 들어오므로, 최소한 최근검색/빈 상태만 보이면 된다.

---

## 2. 네이티브 → 웹 (입력 전달)

네이티브가 아래 전역 함수를 호출한다(`injectJavaScript`). **웹은 이 함수를 가능한 한 일찍 정의**해야 한다.

```ts
// 웹이 정의
window.PainstormSearch = {
  onInput(payload: {
    q: string;        // 검색어 원문 (공백 포함 그대로). '' 이면 결과 대신 최근검색 노출
    branch: string;   // 'ALL' | '압구정' | '잠실' | '수원' | '아차산'
    submit?: boolean; // true = 사용자가 키보드 검색(엔터) 누름 → 최근검색에 저장
  }): void;
};
```

호출 시점(네이티브가 자동 호출):
- 검색어 매 변경(키 입력마다) → `onInput({ q, branch })`
- 지점 칩 변경 → `onInput({ q, branch })`
- 키보드 "검색"(엔터) → `onInput({ q, branch, submit: true })`
- **웹 READY 직후 1회**: 현재 `{ q, branch }` flush (아래 핸드셰이크 참고)

주의:
- 네이티브는 **디바운스하지 않고 원문을 그대로** 보낸다. **API 호출 디바운스(≈250~300ms)는 웹이 담당**한다.
- `branch === 'ALL'` 이면 `/search.json`의 `branch` 파라미터를 **생략**(전체 검색). 그 외에는 지점명을 그대로 `branch`로 전달.
- 같은 `q`라도 `branch`가 바뀌면 재검색해야 한다.
- `submit: true`는 결과를 새로 부르라는 뜻이 아니라(결과는 이미 실시간 갱신됨) **최근검색 저장 트리거**로만 쓰면 된다.

---

## 3. 웹 → 네이티브 (`window.ReactNativeWebView.postMessage`)

JSON 문자열로 전송한다.

### 3-a. `SEARCH_WEB_READY` (필수)

`window.PainstormSearch.onInput`을 등록하고 입력을 받을 준비가 되면 **한 번** 보낸다. 네이티브는 이걸 받은 뒤부터 입력을 주입하고, 받는 즉시 현재 상태를 flush 한다.

```js
window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'SEARCH_WEB_READY' }));
```

> 이 신호 전에 사용자가 이미 타이핑했을 수 있으므로, 네이티브가 최신 `{ q, branch }`를 들고 있다가 READY 시 재전송한다. 웹은 READY만 제때 쏘면 된다.

### 3-b. `SEARCH_SET_QUERY` (권장)

입력창은 네이티브 소유라, **웹의 최근검색 칩을 탭**하는 등 웹이 검색어를 바꾸고 싶을 때 네이티브에 요청한다. 네이티브가 입력값을 갱신하고, 다시 `onInput`으로 되돌려준다(단방향 흐름 유지).

```js
window.ReactNativeWebView?.postMessage(
  JSON.stringify({ type: 'SEARCH_SET_QUERY', q: '풀업' })
);
```

> 웹이 로컬 state로 검색어를 직접 바꾸지 말 것. 항상 네이티브를 진실원본으로 두고 `SEARCH_SET_QUERY` → `onInput` 왕복으로 반영한다(입력창 텍스트와 불일치 방지).

### 3-c. `SEARCH_DISMISS_KEYBOARD` (선택)

키보드는 네이티브 입력창 소유라 웹 스크롤만으로는 자동으로 안 내려간다. 네이티브가 WebView `onScroll`로 **드래그/스크롤 시 자동 dismiss**를 이미 처리하므로 보통은 웹이 아무것도 안 해도 된다. 다만 **탭(빈 영역 터치)으로도 키보드를 내리고 싶으면** 웹이 이 메시지를 보내면 된다.

```js
window.ReactNativeWebView?.postMessage(
  JSON.stringify({ type: 'SEARCH_DISMISS_KEYBOARD' })
);
```

그 외 메시지는 현재 없음. (닫기는 네이티브 X 버튼이 담당)

---

## 4. 웹이 렌더할 것 / 하지 말 것

**렌더한다**
- 제목(예: "검색")
- **빈 검색어** 상태: 최근검색(localStorage) 목록. 탭 시 `SEARCH_SET_QUERY`.
- **검색 결과 리스트**: `/search.json` 결과(지점 단위). 기존 WOD 카드 컴포넌트/스타일 재사용. `matches`로 검색어 하이라이팅.
- **결과 탭 → 상세**: `/day.json?date=&branch=`로 해당 지점 WOD + 기록. SPA 내부에서 전환(상세→목록 뒤로가기도 웹 내부 처리).
- 로딩/빈결과/에러 상태, "더 보기"(offset 페이지네이션).

**렌더하지 않는다**
- 검색 입력창 ❌ (네이티브 제공)
- 지점 선택 UI ❌ (네이티브 칩 바 제공)
- 화면 하단 고정 검색바/탭바 ❌

---

## 5. 레이아웃 제약 (중요)

WebView는 **키보드 바로 위까지 화면을 꽉 채우고**, 네이티브 오버레이(입력바 + 칩 바)가 **그 위에 투명하게 떠 있다**(입력 뒤 배경은 WebView가 비침).

- **하단**: 입력바(높이 ~52px) + 그 위 지점 칩 바(~48px) + safe-area 하단이 **WebView 위에 겹친다**.
  → 웹 컨텐츠는 **하단 패딩 ≥ 130px**(입력바·칩에 안 가리게). 스크롤 리스트 `padding-bottom`, 상세 화면 하단 여백에 반영.
  → 키보드가 열리면 오버레이가 키보드 위로 올라오므로, 스크롤 컨테이너 하단이 그만큼 확보되면 된다(넉넉히 ~130px 권장).
- **상단**: WebView가 **화면 최상단(상태바/노치 뒤)까지** 꽉 채운다. **safe-area top은 웹이 처리**해야 한다 — 컨텐츠 최상단에 `env(safe-area-inset-top)`(또는 뷰포트 `viewport-fit=cover` 기반) 만큼 패딩을 넣어 제목이 노치에 가리지 않게 하라. 상태바 글자는 밝은색(다크 배경) 기준.
- **테마**: 배경 검정 기준 다크 테마로 맞춘다(앱과 이어지게). 투명 필요 없음 — 웹이 자체 검정 배경 풀스크린.
- 가로 스크롤/바운스는 최소화(입력은 네이티브라 웹은 표시 위주).

---

## 6. 동작 요약 / 시퀀스

```
[모달 오픈] 네이티브: /search 로드 + 입력 autofocus(네이티브 키보드)
  웹: 로드 완료 → window.PainstormSearch.onInput 등록 → postMessage(SEARCH_WEB_READY)
  네이티브: READY 수신 → onInput({ q:'', branch:<선호지점|ALL> }) flush
  웹: q 빈값 → 최근검색 노출

[타이핑] 네이티브: 키 입력마다 onInput({ q, branch })
  웹: 디바운스 후 /search.json 호출 → 결과 렌더(하이라이팅)

[지점 칩 탭] 네이티브: onInput({ q, branch }) (branch 변경)
  웹: 재검색

[엔터] 네이티브: onInput({ q, branch, submit:true })
  웹: 최근검색 저장

[최근검색 칩 탭] 웹: postMessage(SEARCH_SET_QUERY, q)
  네이티브: 입력값 갱신 → onInput({ q, branch }) → 웹 재검색

[결과 탭] 웹: /day.json?date=&branch= → 상세 렌더(SPA 내부 전환)

[닫기] 네이티브 X 버튼 → 모달 종료
```

---

## 7. 참고 값

- 지점 코드 매핑: `record01`=압구정, `record03`=잠실, `record04`=수원, `record05`=아차산 (검색/상세 응답의 `branchId`).
- 선호지점 초기값: 네이티브가 앱 설정(`perferBranch`)에서 읽어 첫 `branch`로 넣는다. 값은 `'ALL' | 지점명`.
- 이미지: 응답 URL에 `&w=` 리사이즈 파라미터 사용 가능(최대 1920). 상세는 `docs/search-api.md` 참고.
