# WOD 검색 API 명세

WOD 본문을 검색해 날짜 리스트를 얻고, 특정 날짜의 WOD + 지점별 기록을 함께 조회하는 API.

- **Base URL**: `https://painstorm-push-noti.dowon938.workers.dev`
- **CORS**: 전체 허용(`*`) — 클라이언트에서 직접 호출 가능
- **인증**: 불필요(공개 GET)
- **날짜 키**: 모든 매칭은 `YYMMDD`(예: `260717`) 기준. wr_id/게시일이 아니라 콘텐츠에서 파생된 날짜라 재업로드에도 안정적.

---

## 1. `GET /search.json` — WOD 검색

검색어가 포함된 WOD를 날짜 리스트로 반환한다. 본문(각 지점 와드)+제목을 매칭하며, **공백·하이픈·대소문자를 무시**하고 **중간 부분일치**까지 지원한다 (`pull up` = `Pull-up` = `pullup`, `hrust` → `Thrusters`).

### Query params

| param | 필수 | 기본 | 설명 |
|---|---|---|---|
| `q` | ✅ | — | 검색어. 빈 값이면 `items: []` 반환 |
| `limit` | | `20` | 페이지 크기, **1~50** (초과 시 50으로 클램프) |
| `offset` | | `0` | 건너뛸 개수 |

### Response `200`

```jsonc
{
  "items": [
    {
      "date": "260717",              // YYMMDD, 날짜 키 → /day.json 에 그대로 전달
      "title": "Friday 260717",      // 원본 WOD 제목
      "weekdayTitle": "Friday 260717",
      "imageUrl": "https://.../image?src=...", // 없으면 필드 생략
      "snippet": "Pull-ups"          // 매칭된 본문 라인. 없을 수 있음
    }
  ],
  "total": 140,                      // 전체 매칭 수(페이지 계산용)
  "query": "pull up",
  "page": { "limit": 20, "offset": 0 }
}
```

### 페이지네이션
- N번째 페이지: `offset = (N - 1) * limit`
- 전체 페이지 수: `Math.ceil(total / limit)`
- "더 보기": `offset += limit`
- 정렬: **최신 날짜 먼저**

### 주의
- `q`가 정규화 후 2자 이하이면 FTS(trigram, 3자 이상) 대신 JS 스캔으로 폴백한다(결과 기준은 동일).
- 정규화는 문자를 그대로 유지하므로 **한글 동작명은 영어 검색과 별개**다.

---

## 2. `GET /day.json` — 특정 날짜 상세

검색 결과 클릭 시, 그날의 WOD와 지점별 기록을 함께 반환한다.

### Query params

| param | 필수 | 설명 |
|---|---|---|
| `date` | ✅ | `YYMMDD` (예: `260717`). 형식이 아니면 `400` |

### Response `200`

```jsonc
{
  "date": "260717",
  "weekdayTitle": "Friday 260717",
  "wod": {                           // 해당 날짜 WOD 없으면 null
    "title": "Friday 260717",
    "wods": [                        // 지점별 브랜치
      { "name": "압구정", "lines": ["5 Rounds", "18/15 Row", "..."] },
      { "name": "잠실",   "lines": ["..."] }
    ],
    "imageUrl": "https://.../image?src=..." // 없으면 생략
  },
  "records": [                       // 항상 4지점, 고정 순서: 압구정 → 잠실 → 수원 → 아차산
    { "branch": "record01", "name": "압구정", "lines": ["Rx 3:21"], "images": ["https://.../image?src=..."], "hasRecord": true },
    { "branch": "record03", "name": "잠실",   "lines": [], "images": [], "hasRecord": false }
    // record04 수원, record05 아차산 ...
  ],
  "fetchedAt": "2026-07-17T07:51:42.749Z"
}
```

### Response `400` (잘못된 date)

```json
{ "error": { "message": "invalid date (expected YYMMDD)" } }
```

### 주의
- `records`는 **항상 4개** 원소를 포함한다(기록 없는 지점도 `hasRecord: false`, `lines: []`로 들어옴). placeholder 렌더 판단은 `hasRecord`로 한다.
- `wod`는 해당 날짜 WOD가 없으면 `null`.

---

## 3. 이미지 (`imageUrl`, `images[]`)

- 반환되는 이미지 URL은 이미 워커 이미지 프록시(webp 변환)를 거친 값이므로 `<Image source={{ uri }}>`에 그대로 사용한다.
- **리사이즈**가 필요하면 URL 뒤에 `&w=`를 붙인다: 예 `.../image?src=...&w=640` (최대 1920). `&q=`로 품질 지정(기본 80).

---

## 4. TypeScript 타입

```ts
export type WodSearchItem = {
  date: string;         // YYMMDD
  title?: string;
  weekdayTitle: string;
  imageUrl?: string;
  snippet?: string;
};

export type WodSearchResponse = {
  items: WodSearchItem[];
  total: number;
  query: string;
  page: { limit: number; offset: number };
};

export type WodBranch = { name: string; lines: string[] };

export type DayRecord = {
  branch: string;       // record01 | record03 | record04 | record05
  name: string;         // 압구정 | 잠실 | 수원 | 아차산
  lines: string[];
  images: string[];
  hasRecord: boolean;
};

export type DayResponse = {
  date: string;         // YYMMDD
  weekdayTitle: string;
  wod: { title?: string; wods: WodBranch[]; imageUrl?: string } | null;
  records: DayRecord[]; // 항상 4개
  fetchedAt: string;
};
```

---

## 5. 사용 흐름 예시

```ts
const BASE = 'https://painstorm-push-noti.dowon938.workers.dev';

// 1) 검색
async function searchWods(q: string, page = 0, limit = 20): Promise<WodSearchResponse> {
  const url = `${BASE}/search.json?q=${encodeURIComponent(q)}&limit=${limit}&offset=${page * limit}`;
  return (await fetch(url)).json();
}

// 2) 결과 클릭 → 날짜 상세
async function getDay(date: string): Promise<DayResponse> {
  return (await fetch(`${BASE}/day.json?date=${date}`)).json();
}

// 예: "pull up" 검색 → 첫 결과의 그날 WOD+기록
const res = await searchWods('pull up');
if (res.items.length) {
  const day = await getDay(res.items[0].date);
  // day.wod, day.records 렌더
}
```

---

## 참고: 관련 기존 엔드포인트

이번 검색 기능 외에, 앱에서 이미 쓰고 있을 수 있는 공개 엔드포인트:

- `GET /wod.json?limit=&offset=` — 최신 WOD 목록
- `GET /record.json?branch=&limit=&offset=` — 날짜별 그룹 기록
- `GET /location.json` — 지점 정보
