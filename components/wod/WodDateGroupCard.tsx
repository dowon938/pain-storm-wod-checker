import { type WodDateGroup } from '@/lib/schemas';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { WodCard } from './WodCard';

type Props = {
  group: WodDateGroup;
};

export function WodDateGroupCard({ group }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={{ backgroundColor: 'white', borderRadius: 8, overflow: 'hidden' }}
      onPress={() => {
        router.push(
          `stack-webview?detailId=${group?.entries?.[0]?.link?.split(';')[1]}`
        );
        // router.push(`/wod/${group.dateLabel}`);
      }}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            width: '100%',
            height: group.imageUrl ? 200 : 44,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }}
        >
          {group.imageUrl ? (
            <Image
              source={{ uri: group.imageUrl }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#f3f4f6',
              }}
              contentFit='cover'
              transition={150}
            />
          ) : null}
          <Text
            style={{
              fontSize: 24,
              fontWeight: '900',
              position: 'absolute',
              bottom: 8,
              left: 16,
              right: 16,
              color: 'rgba(255, 255, 255, 1)',
              textShadowColor: 'rgba(0, 0, 0, 0.4)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {group.title}
          </Text>
        </View>
        <View style={{ padding: 12 }}>
          <View style={{ gap: 8 }}>
            {group.entries.map((e, idx) => (
              <WodCard key={`${e.id}-${idx}`} entry={e} />
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
