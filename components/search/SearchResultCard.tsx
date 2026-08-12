import {
  HighlightedText,
  lineRanges,
  titleRanges,
} from '@/components/search/HighlightedText';
import { hapticLight } from '@/hooks/haptic';
import {
  getEnglishBranchName,
  withResize,
  type SearchItem,
} from '@/lib/search-api';
import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// 검색 결과 한 건(지점 단위) 카드. 탭하면 상세(웹뷰)로 전환.
// 웹 pain-storm-wod-web/src/components/search/SearchResultCard.tsx의 시각 언어를
// 그대로 옮긴 것: 제목 = Heavitas(font-heading), 우측 썸네일 + 지점 영문 라벨.
function SearchResultCard({
  item,
  onSelect,
}: {
  item: SearchItem;
  onSelect: (item: SearchItem) => void;
}) {
  const titleText = item.title ?? item.weekdayTitle ?? '';
  const branchLabel = getEnglishBranchName(item.branch);
  // 이미지 로딩 실패 시 깨진 썸네일 박스 대신 렌더 자체를 생략.
  const [thumbFailed, setThumbFailed] = useState(false);
  const thumb = item.imageUrl && !thumbFailed ? item.imageUrl : null;

  return (
    <Pressable
      onPress={() => {
        hapticLight();
        onSelect(item);
      }}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole='button'
    >
      <View style={styles.row}>
        {/* 본문(제목 + 라인) */}
        <View style={styles.body}>
          <HighlightedText
            text={titleText}
            ranges={titleRanges(item.matches)}
            style={styles.title}
          />
          <View style={styles.lines}>
            {item.lines.map((line, li) => (
              <HighlightedText
                key={li}
                text={line}
                ranges={lineRanges(item.matches, li)}
                style={styles.line}
              />
            ))}
          </View>
        </View>

        {/* 우측 컬럼: 썸네일(위) + 지점 라벨(아래, 오른쪽 정렬) */}
        <View style={styles.side}>
          {thumb && (
            <Image
              source={{ uri: withResize(thumb, 240) }}
              style={styles.thumb}
              contentFit='cover'
              transition={120}
              onError={() => setThumbFailed(true)}
            />
          )}
          <Text style={styles.branchLabel}>{branchLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default memo(SearchResultCard);

const styles = StyleSheet.create({
  // 웹: rounded-2xl border-white/10 bg-white/5 px-4 py-3
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    transform: [{ scale: 0.99 }],
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Heavitas',
    fontSize: 15,
    lineHeight: 20,
    color: 'white',
    marginBottom: 6,
  },
  lines: {
    gap: 2,
  },
  line: {
    fontFamily: 'Paperlogy',
    fontSize: 14,
    lineHeight: 14 * 1.6,
    color: '#D1D5DB',
  },
  side: {
    alignItems: 'flex-end',
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  branchLabel: {
    marginTop: 'auto',
    paddingTop: 8,
    fontFamily: 'Heavitas',
    fontSize: 16,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.5)',
  },
});
