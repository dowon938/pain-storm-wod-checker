import { Wod } from '@/lib/schemas';
import React, { memo } from 'react';
import { Text, View } from 'react-native';

type Props = {
  wod: Wod;
  itemHeightsRef: React.RefObject<Record<number, number>>;
  idx: number;
  isAllAtOnce?: boolean;
};

function WodCard({ wod, itemHeightsRef, idx, isAllAtOnce = false }: Props) {
  console.log('WodCard');
  return (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        gap: 8,
        marginVertical: isAllAtOnce ? 0 : 12,
      }}
      onLayout={(e) => {
        itemHeightsRef.current[idx] = e.nativeEvent.layout.height;
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '600' }}>{wod.name}</Text>
        {/* <Text style={{ fontSize: 12, color: '#6b7280' }}>
          {entry.dateLabel}
        </Text> */}
      </View>
      {/* <Text
        style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}
        numberOfLines={2}
      >
        {entry.title}
      </Text> */}
      <View style={{ gap: 5, marginBottom: 4 }}>
        {wod.lines.map((line, idx) => (
          <Text
            key={`${wod.name}-${idx}`}
            style={{ fontSize: 14, color: '#374151' }}
          >
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default memo(WodCard);
