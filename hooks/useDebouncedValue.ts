import { useEffect, useState } from 'react';

/**
 * 값이 `delay`(ms) 동안 안정된 뒤에야 따라오는 파생 값.
 * 입력할 때마다 네트워크 요청이 나가는 걸 막는 용도(예: 검색어).
 *
 * setState가 타이머 콜백 안에서만 일어나므로 렌더 → effect → 렌더 연쇄가 없다.
 * "지연 없이 즉시 반영"이 필요한 케이스(예: 빈 검색어)는 이 훅이 아니라
 * 호출부에서 파생 값으로 분기한다 — `q ? debounced : ''`.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
