import { MMKV } from 'react-native-mmkv';

// 최근 검색어 + 마지막 검색어(앱 로컬 전용).
// 웹(pain-storm-wod-web/src/lib/recent-search.ts)의 localStorage 구현과 동일 동작.
// 지점 선택 같은 "동기화 설정"이 아니라 이 화면에 한정된 로컬 이력이므로
// synced-storage가 아닌 기본 MMKV 인스턴스를 쓴다.
// (웹 검색을 쓰던 시절의 localStorage 이력은 이관되지 않는다 — 부가 기능이라 감수.)

const storage = new MMKV();

const RECENT_KEY = 'search.recent';
const DRAFT_KEY = 'search.lastQuery';
// 대부분의 검색 UI가 최근검색을 10개 안팎으로 유지한다(모바일에서 한 번에
// 훑기 좋은 수준). 넘치면 오래된 것부터 버린다.
const MAX = 10;

export function getRecentSearches(): string[] {
  try {
    const raw = storage.getString(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

function write(list: string[]): string[] {
  storage.set(RECENT_KEY, JSON.stringify(list));
  return list;
}

/** 검색어를 맨 앞에 추가(중복 제거, 대소문자/공백 정리). 갱신된 목록을 반환. */
export function addRecentSearch(q: string): string[] {
  const term = q.trim();
  if (!term) return getRecentSearches();
  const prev = getRecentSearches();
  const deduped = prev.filter((t) => t.toLowerCase() !== term.toLowerCase());
  return write([term, ...deduped].slice(0, MAX));
}

export function removeRecentSearch(q: string): string[] {
  const prev = getRecentSearches();
  return write(prev.filter((t) => t !== q));
}

export function clearRecentSearches(): string[] {
  return write([]);
}

/** 마지막 검색어. 화면 재진입 시 복원해 검색 흐름의 연속성을 준다. */
export function getLastQuery(): string {
  return storage.getString(DRAFT_KEY) ?? '';
}

export function setLastQuery(q: string): void {
  storage.set(DRAFT_KEY, q);
}
