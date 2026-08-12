import { hapticLight } from '@/hooks/haptic';
import Octicons from '@expo/vector-icons/Octicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// 빈 검색어 상태의 최근검색 목록. 항목 탭 시 검색어를 그대로 입력창에 채운다.
// (웹 pain-storm-wod-web/src/components/search/RecentSearches.tsx 포팅)
export default function RecentSearches({
  items,
  onSelect,
  onRemove,
  onClear,
}: {
  items: string[];
  onSelect: (q: string) => void;
  onRemove: (q: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Octicons name='clock' size={26} color='rgba(255,255,255,0.25)' />
        <Text style={styles.emptyTitle}>최근 검색 기록이 없습니다.</Text>
        <Text style={styles.emptyHint}>동작 이름이나 WOD를 검색해 보세요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.heading}>최근 검색</Text>
        <Pressable
          hitSlop={8}
          onPress={() => {
            hapticLight();
            onClear();
          }}
        >
          {({ pressed }) => (
            <Text style={[styles.clearAll, pressed && styles.pressedText]}>
              전체 삭제
            </Text>
          )}
        </Pressable>
      </View>

      {items.map((term) => (
        <View key={term} style={styles.itemRow}>
          <Pressable
            onPress={() => {
              hapticLight();
              onSelect(term);
            }}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Octicons name='clock' size={15} color='rgba(255,255,255,0.3)' />
            <Text style={styles.term} numberOfLines={1}>
              {term}
            </Text>
          </Pressable>
          <Pressable
            hitSlop={6}
            accessibilityLabel={`${term} 삭제`}
            onPress={() => {
              hapticLight();
              onRemove(term);
            }}
            style={styles.remove}
          >
            {({ pressed }) => (
              <Octicons
                name='x'
                size={15}
                color={
                  pressed ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)'
                }
              />
            )}
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heading: {
    fontFamily: 'Heavitas',
    fontSize: 12,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.45)',
  },
  clearAll: {
    fontFamily: 'Paperlogy',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  pressedText: {
    color: 'rgba(255,255,255,0.7)',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    paddingVertical: 10,
    paddingLeft: 4,
    paddingRight: 8,
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  term: {
    flex: 1,
    fontFamily: 'Paperlogy',
    fontSize: 15,
    color: '#E5E7EB',
  },
  remove: {
    padding: 8,
    borderRadius: 999,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 96,
    gap: 4,
  },
  emptyTitle: {
    marginTop: 8,
    fontFamily: 'Paperlogy',
    fontSize: 14,
    color: '#6B7280',
  },
  emptyHint: {
    fontFamily: 'Paperlogy',
    fontSize: 12,
    color: '#4B5563',
  },
});
