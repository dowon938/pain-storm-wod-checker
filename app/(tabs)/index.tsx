import { WodDateGroupCard } from '@/components/wod/WodDateGroupCard';
import { useWods } from '@/hooks/useWod';
import { Image } from 'expo-image';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const LogoMultiplier = 0.7;

export default function HomeScreen() {
  const { top } = useSafeAreaInsets();
  const { data, isLoading, isRefetching, refetch, error } = useWods();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={[]}>
      <View style={{ padding: 12, paddingTop: top }}>
        <Image
          source={{ uri: 'http://painstorm.co.kr/theme/basic/img/logo.png' }}
          style={{ width: 208 * LogoMultiplier, height: 25 * LogoMultiplier }}
          contentFit='cover'
          transition={150}
        />
      </View>
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
          contentContainerStyle={{
            paddingVertical: 12,
            paddingHorizontal: 0,
            gap: 16,
          }}
          data={data?.wodItems || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <WodDateGroupCard wodItem={item} />}
          refreshControl={
            <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} />
          }
        />
      )}
    </SafeAreaView>
  );
}
