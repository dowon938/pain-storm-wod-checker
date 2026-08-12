import type { SearchMatch } from '@/lib/search-api';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

type Range = { start: number; end: number };

// 한 문자열 + 그 문자열의 매칭 구간들 → 하이라이트 세그먼트로 분할.
// matches 는 원문 오프셋([start, end), UTF-16 코드유닛)이라 slice 로 바로 자른다.
// (웹 pain-storm-wod-web/src/components/search/HighlightedText.tsx와 동일 로직)
function toSegments(
  text: string,
  ranges: Range[],
): { text: string; hit: boolean }[] {
  const sorted = [...ranges]
    .filter((r) => r.end > r.start && r.start >= 0)
    .sort((a, b) => a.start - b.start);
  const parts: { text: string; hit: boolean }[] = [];
  let cur = 0;
  for (const r of sorted) {
    const start = Math.max(r.start, cur); // 겹치는 범위 방어
    if (start >= text.length) break;
    if (start > cur) parts.push({ text: text.slice(cur, start), hit: false });
    const end = Math.min(r.end, text.length);
    if (end > start) parts.push({ text: text.slice(start, end), hit: true });
    cur = Math.max(cur, end);
  }
  if (cur < text.length) parts.push({ text: text.slice(cur), hit: false });
  return parts;
}

/** 검색어가 걸린 구간을 강조 표시하는 텍스트. 다크 테마용 색. */
export function HighlightedText({
  text,
  ranges,
  style,
  numberOfLines,
}: {
  text: string;
  ranges: Range[];
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  if (!ranges.length) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }
  const segments = toSegments(text, ranges);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((seg, i) =>
        seg.hit ? (
          <Text key={i} style={styles.hit}>
            {seg.text}
          </Text>
        ) : (
          seg.text
        ),
      )}
    </Text>
  );
}

/** matches 배열에서 특정 라인 인덱스의 구간만 골라낸다. */
export function lineRanges(matches: SearchMatch[], lineIndex: number): Range[] {
  return matches.filter(
    (m): m is Extract<SearchMatch, { line: number }> =>
      'line' in m && m.line === lineIndex,
  );
}

/** matches 배열에서 제목(title) 구간만 골라낸다. */
export function titleRanges(matches: SearchMatch[]): Range[] {
  return matches.filter(
    (m): m is Extract<SearchMatch, { field: 'title' }> =>
      'field' in m && m.field === 'title',
  );
}

const styles = StyleSheet.create({
  // 웹의 bg-yellow-300/25 + text-yellow-200 + font-bold 대응.
  hit: {
    backgroundColor: 'rgba(253, 224, 71, 0.25)',
    color: '#FEF08A',
    fontFamily: 'PaperlogyExtraBold',
  },
});
