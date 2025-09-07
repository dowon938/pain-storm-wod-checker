import { type WodDateGroup } from '@/lib/schemas';
import { Image } from 'expo-image';
import React from 'react';
import { Text, View } from 'react-native';
import { WodCard } from './WodCard';

type Props = {
  group: WodDateGroup;
};

export function WodDateGroupCard({ group }: Props) {
  return (
    <View
      style={{ backgroundColor: 'white', borderRadius: 12, overflow: 'hidden' }}
    >
      {group.imageUrl ? (
        <Image
          source={{ uri: group.imageUrl }}
          style={{ width: '100%', height: 180, backgroundColor: '#f3f4f6' }}
          contentFit='cover'
          transition={150}
        />
      ) : null}
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>{group.title}</Text>
        <View style={{ gap: 12 }}>
          {group.entries.map((e, idx) => (
            <WodCard key={`${e.id}-${idx}`} entry={e} />
          ))}
        </View>
      </View>
    </View>
  );
}
