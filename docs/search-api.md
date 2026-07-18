# WOD 검색 API 명세 (지점 단위)

WOD를 **지점(branch) 단위**로 검색해 매칭 결과를 얻고, 특정 날짜·지점의 WOD + 기록을 조회하는 API. 검색 결과에는 하이라이팅용 **원문 오프셋(matches)** 이 포함된다.

- **Base URL**: `https://painstorm-push-noti.dowon938.workers.dev`
- **CORS**: 전체 허용(`*`) — 클라이언트에서 직접 호출 가능
- **인증**: 불필요(공개 GET)
- **날짜 키**: `YYMMDD`(예: `260717`). wr_id/게시일이 아니라 콘텐츠에서 파생.
- **지점 코드**: `record01`=압구정, `record03`=잠실, `record04`=수원, `record05`=아차산

---

## 1. `GET /search.json` — 지점 단위 WOD 검색

검색어가 포함된 WOD를 **지점 단위**로 반환한다. 한 날짜에 여러 지점이 매칭되면 각각 **별도 item**으로 나온다(같은 날 압구정+아차산 매칭 → item 2개). 매칭은 **해당 지점의 WOD 라인 + 제목** 기준이며, 공백·하이픈·대소문자를 무시하고 중간 부분일치까지 지원한다(FTS5 trigram).

> 참고: WOD 본문이 지점별로 나뉘어 있고(`[압구정]…[잠실]…`), "공통" 와드는 전 지점에 동일 적용된다. 응답은 이 규칙을 반영해 지점별로 전개된 결과다.

### Query params

| param | 필수 | 기본 | 설명 |
|---|---|---|---|
| `q` | ✅ | — | 검색어. 빈 값이면 `items: []` |
| `limit` | | `20` | 페이지 크기, **1~50** (초과 시 50) |
| `offset` | | `0` | 건너뛸 개수 (**지점 단위**) |
| `branch` | | — | 지점 필터. 지점명(`압구정`) 또는 코드(`record01`). 인식 불가 시 **`400`** |

### Response `200`

```jsonc
{
  "items": [
    {
      "date": "260718",              // YYMMDD (날짜 키)
      "branch": "압구정",             // 지점명
      "branchId": "record01",        // 지점 코드
      "title": "Saturday 260718",    // 원본 WOD 제목
      "weekdayTitle": "Saturday 260718",
      "imageUrl": "https://.../image?src=...", // 없으면 생략
      "lines": ["30 Pull-ups", "Run 400m"],    // 해당 지점 WOD "전체" 라인
      "matches": [                   // 하이라이팅용 (원문 오프셋)
        { "line": 0, "start": 3, "end": 10 }   // lines[0]="30 Pull-ups" 의 [3,10) = "Pull-up"
      ],
      "snippet": "30 Pull-ups"       // (전이 호환) 매칭된 첫 라인. 신규 코드는 matches 사용 권장
    }
  ],
  "total": 142,                      // 지점 단위 매칭 총 개수
  "query": "pull up",
  "page": { "limit": 20, "offset": 0 }
}
```

### `matches` — 하이라이팅 규격 (중요)

각 원소는 **원문 문자열 기준** `[start, end)` 범위다. 정규화(공백/하이픈 제거) 이전 **원문 오프셋**이며, JS 문자열 인덱스(UTF-16 코드유닛)이므로 `str.slice(start, end)` 로 바로 하이라이트 구간을 얻는다.

- **라인 매칭**: `{ line: number, start: number, end: number }`
  - `line` = `lines` 배열 인덱스. 대상 문자열 = `lines[line]`.
- **제목 매칭**: `{ field: "title", start: number, end: number }`
  - 대상 문자열 = `title`.

정규화로 제거된 공백/하이픈이 매칭 구간 안에 있으면 범위에 포함된다.
예: `"Pull-up"` 에서 `"pull up"` 검색 → `[0, 7)` = `"Pull-up"` (하이픈 포함). `"Pull-ups"` 에서 `"pull up"` → `[.. )` = `"Pull-up"` (뒤 `s`는 제외).

### 페이지네이션 & 정렬
- **지점 단위**로 센다: `offset = (page-1)*limit`, 전체 페이지 = `Math.ceil(total/limit)`.
- 정렬: **최신 날짜 먼저**, 같은 날짜 내에서는 지점 고정순서(압구정→잠실→수원→아차산).

### 주의
- `q`가 정규화 후 2자 이하이면 FTS 대신 JS 스캔 폴백(결과 기준 동일).
- 한글 동작명은 영어 검색과 별개(정규화가 문자를 그대로 유지).

---

## 2. `GET /day.json` — 특정 날짜 상세

### 2-a. 지점 미지정 (기존/하위호환)

그날의 WOD(지점별 브랜치 전체)와 4지점 기록을 함께 반환.

**Query**: `date`(필수, `YYMMDD`). 형식 오류 시 `400`.

```jsonc
{
  "date": "260717",
  "weekdayTitle": "Friday 260717",
  "wod": {                           // 없으면 null
    "title": "Friday 260717",
    "wods": [ { "name": "압구정", "lines": ["..."] }, { "name": "잠실", "lines": ["..."] } ],
    "imageUrl": "https://.../image?src=..."
  },
  "records": [                       // 항상 4지점, 순서: 압구정→잠실→수원→아차산
    { "branch": "record01", "name": "압구정", "lines": ["Rx 3:21"], "images": ["..."], "hasRecord": true },
    { "branch": "record03", "name": "잠실",   "lines": [], "images": [], "hasRecord": false }
  ],
  "fetchedAt": "2026-07-18T..."
}
```

### 2-b. 지점 지정 (`branch`)

**Query**: `date`(필수), `branch`(지점명 또는 코드). 잘못된 `branch` → **`400`** `{ "error": { "message": "invalid branch" } }`.

해당 지점의 WOD(단일)와 기록(단일)만 반환.

```jsonc
{
  "date": "260718",
  "weekdayTitle": "Saturday 260718",
  "branch": "압구정",
  "branchId": "record01",
  "wod": {                           // 해당 지점 프로그래밍 없으면 null
    "title": "Saturday 260718",
    "lines": ["30 Pull-ups", "Run 400m"],  // 단일 지점 라인 (wods[] 아님)
    "imageUrl": "https://.../image?src=..."
  },
  "record": {                        // 해당 지점 기록 없으면 null
    "branch": "record01", "name": "압구정",
    "lines": ["압구정 3:00"], "images": ["..."], "hasRecord": true
  },
  "fetchedAt": "2026-07-18T..."
}
```

### 에러
- `date`가 `YYMMDD` 아님 → `400` `{ "error": { "message": "invalid date (expected YYMMDD)" } }`
- `branch` 인식 불가 → `400` `{ "error": { "message": "invalid branch" } }`

---

## 3. 이미지 (`imageUrl`, `images[]`)

- 반환 URL은 이미 워커 이미지 프록시(webp)를 거친 값 → `<Image source={{ uri }}>` 에 그대로 사용.
- 리사이즈: URL 뒤에 `&w=640` (최대 1920), 품질 `&q=`(기본 80).

---

## 4. TypeScript 타입

```ts
export type BranchId = 'record01' | 'record03' | 'record04' | 'record05';

// 하이라이팅용 매칭 (원문 오프셋, [start, end))
export type SearchMatch =
  | { line: number; start: number; end: number }       // lines[line] 대상
  | { field: 'title'; start: number; end: number };     // title 대상

export type SearchItem = {
  date: string;          // YYMMDD
  branch: string;        // 지점명
  branchId: BranchId;
  title?: string;
  weekdayTitle: string;
  imageUrl?: string;
  lines: string[];       // 해당 지점 전체 라인
  matches: SearchMatch[];
  snippet?: string;      // (deprecated) 매칭된 첫 라인
};

export type SearchResponse = {
  items: SearchItem[];
  total: number;         // 지점 단위 총 개수
  query: string;
  page: { limit: number; offset: number };
};

export type WodBranch = { name: string; lines: string[] };
export type DayRecord = { branch: BranchId; name: string; lines: string[]; images: string[]; hasRecord: boolean };

// 지점 미지정
export type DayResponse = {
  date: string;
  weekdayTitle: string;
  wod: { title?: string; wods: WodBranch[]; imageUrl?: string } | null;
  records: DayRecord[]; // 항상 4개
  fetchedAt: string;
};

// 지점 지정 (?branch=)
export type DayBranchResponse = {
  date: string;
  weekdayTitle: string;
  branch: string;
  branchId: BranchId;
  wod: { title?: string; lines: string[]; imageUrl?: string } | null;
  record: DayRecord | null;
  fetchedAt: string;
};
```

---

## 5. 사용 예시

### 검색 → 지점 상세
```ts
const BASE = 'https://painstorm-push-noti.dowon938.workers.dev';

async function search(q: string, opts: { page?: number; limit?: number; branch?: string } = {}): Promise<SearchResponse> {
  const { page = 0, limit = 20, branch } = opts;
  const p = new URLSearchParams({ q, limit: String(limit), offset: String(page * limit) });
  if (branch) p.set('branch', branch);
  return (await fetch(`${BASE}/search.json?${p}`)).json();
}

async function getDayBranch(date: string, branch: string): Promise<DayBranchResponse> {
  return (await fetch(`${BASE}/day.json?date=${date}&branch=${encodeURIComponent(branch)}`)).json();
}

// "pull up" 검색 → 첫 결과의 해당 지점 상세
const res = await search('pull up');
const it = res.items[0];               // { date, branchId, ... }
const day = await getDayBranch(it.date, it.branchId);
```

### 하이라이팅 렌더 (React Native 예시)
```tsx
// 한 줄 텍스트 + 그 줄의 매칭 구간들 → 하이라이트 세그먼트로 분할
function renderLine(text: string, ranges: { start: number; end: number }[]) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const parts: { text: string; hit: boolean }[] = [];
  let cur = 0;
  for (const r of sorted) {
    if (r.start > cur) parts.push({ text: text.slice(cur, r.start), hit: false });
    parts.push({ text: text.slice(r.start, r.end), hit: true });
    cur = r.end;
  }
  if (cur < text.length) parts.push({ text: text.slice(cur), hit: false });
  return (
    <Text>
      {parts.map((p, i) => (
        <Text key={i} style={p.hit ? { backgroundColor: '#ffe58f', fontWeight: '700' } : undefined}>
          {p.text}
        </Text>
      ))}
    </Text>
  );
}

// item 렌더: 각 라인에 대해, 그 라인 인덱스를 가진 matches만 골라 넘김
item.lines.map((line, li) =>
  renderLine(line, item.matches.filter((m) => 'line' in m && m.line === li) as any)
);
```

---

## 참고: 관련 기존 엔드포인트
- `GET /wod.json?limit=&offset=` — 최신 WOD 목록
- `GET /record.json?branch=&limit=&offset=` — 날짜별 그룹 기록
- `GET /location.json` — 지점 정보
