import { Wod } from '@/lib/schemas';
import React from 'react';
import { Text, View } from 'react-native';

type Props = {
  wod: Wod;
};

export function WodCard({ wod }: Props) {
  return (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        gap: 8,
        // shadowColor: '#000',
        // shadowOpacity: 0.12,
        // shadowRadius: 8,
        // shadowOffset: { width: 0, height: 2 },
        // elevation: 2,
        marginVertical: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{wod.name}</Text>
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
      <View style={{ gap: 4 }}>
        {wod.lines.map((line, idx) => (
          <Text
            key={`${wod.name}-${idx}`}
            style={{ fontSize: 13, color: '#374151' }}
          >
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}
