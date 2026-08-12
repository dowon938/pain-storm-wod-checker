// 검색/상세 API 레이어. 웹(pain-storm-wod-web/src/lib/search.ts)과 동일 명세.
// 명세: docs/search-api.md (동일 문서가 웹 레포에도 있음).

const BASE = 'https://painstorm-push-noti.dowon938.workers.dev';

export type BranchId = 'record01' | 'record03' | 'record04' | 'record05';

// 하이라이팅용 매칭 (원문 UTF-16 오프셋, [start, end))
export type SearchMatch =
  | { line: number; start: number; end: number } // lines[line] 대상
  | { field: 'title'; start: number; end: number }; // title 대상

export type SearchItem = {
  date: string; // YYMMDD
  branch: string; // 지점명
  branchId: BranchId;
  title?: string;
  weekdayTitle: string;
  imageUrl?: string;
  lines: string[]; // 해당 지점 전체 라인
  matches: SearchMatch[];
};

export type SearchResponse = {
  items: SearchItem[];
  total: number; // 지점 단위 총 개수
  query: string;
  page: { limit: number; offset: number };
};

// 지점 코드 ↔ 지점명 (검색 응답의 branchId 기준)
export const BRANCH_ID_TO_NAME: Record<BranchId, string> = {
  record01: '압구정',
  record03: '잠실',
  record04: '수원',
  record05: '아차산',
};

// 카드 우하단 영문 라벨. 웹 SearchResultCard의 getEnglishBranchName과 동일 표기.
export const BRANCH_ENGLISH_NAME: Record<string, string> = {
  압구정: 'APGUJEONG.',
  잠실: 'JAMSIL.',
  수원: 'SUWON.',
  아차산: 'ACHASAN.',
  기타: 'ETC.',
};

export function getEnglishBranchName(branch?: string): string {
  if (!branch) return '';
  return BRANCH_ENGLISH_NAME[branch] ?? branch;
}

/**
 * 이미지 프록시 URL에 리사이즈 파라미터를 붙인다(w 최대 1920, q 기본 80).
 * 네이티브 목록은 웹뷰와 이미지 캐시를 공유하지 않으므로, 썸네일은
 * 원본(최대 1200px) 대신 작은 파생본을 받아 목록 메모리를 아낀다.
 */
export function withResize(url: string, w = 640, q = 80): string {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}w=${w}&q=${q}`;
}

export type SearchParams = {
  q: string;
  branch?: string; // 'ALL' | 지점명 | 코드. 'ALL'/빈값이면 파라미터 생략(전체)
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
};

export async function searchWods({
  q,
  branch,
  limit = 20,
  offset = 0,
  signal,
}: SearchParams): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    offset: String(offset),
  });
  // branch === 'ALL'이면 branch 파라미터를 생략(전체 검색).
  if (branch && branch !== 'ALL') params.set('branch', branch);

  const res = await fetch(`${BASE}/search.json?${params.toString()}`, {
    signal,
  });
  if (!res.ok) {
    throw new Error(`검색 실패: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as Partial<SearchResponse>;
  return {
    items: Array.isArray(json.items) ? json.items : [],
    total: typeof json.total === 'number' ? json.total : 0,
    query: json.query ?? q,
    page: json.page ?? { limit, offset },
  };
}
