import { WodDateGroupCard } from '@/components/wod/WodDateGroupCard';
import { useWodGroupedByDate } from '@/hooks/useWod';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { data, isLoading, isRefetching, refetch, error } =
    useWodGroupedByDate();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {isLoading ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <Text style={{ color: '#b91c1c', fontWeight: '600' }}>
            불러오기 실패
          </Text>
          <Text style={{ color: '#6b7280', marginTop: 4 }}>
            {String(error.message)}
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, gap: 16 }}
          data={data?.groups ?? []}
          keyExtractor={(item) => item.dateLabel}
          renderItem={({ item }) => <WodDateGroupCard group={item} />}
          refreshControl={
            <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} />
          }
        />
      )}
    </SafeAreaView>
  );
}
