import { type WodEntry } from '@/lib/schemas';
import React from 'react';
import { Text, View } from 'react-native';

type Props = {
  entry: WodEntry;
};

export function WodCard({ entry }: Props) {
  return (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{entry.branch}</Text>
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
        {entry.lines.map((line, idx) => (
          <Text
            key={`${entry.id}-${idx}`}
            style={{ fontSize: 13, color: '#374151' }}
          >
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}
