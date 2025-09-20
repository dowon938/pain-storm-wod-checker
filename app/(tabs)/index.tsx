import BranchSelector from '@/components/wod/BranchSelector';
import { WodDateGroupCard } from '@/components/wod/WodDateGroupCard';
import { useWods } from '@/hooks/useWod';
import { createStore } from '@/lib/create-auto-store';
import { WodItem } from '@/lib/schemas';
import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const LogoMultiplier = 0.95;

export const {
  readGlobalRefetchWods,
  updateGlobalRefetchWods,
  useWatchGlobalRefetchWods,
} = createStore({
  globalRefetchWods: () => {},
});

export default function HomeScreen() {
  const { top } = useSafeAreaInsets();
  const { data, isLoading, isRefetching, refetch, error } = useWods();
  const flatListRef = useRef<FlatList<WodItem>>(null);

  useEffect(() => {
    updateGlobalRefetchWods(refetch);
  }, [refetch]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={[]}>
      <Pressable
        style={{
          padding: 12,
          paddingTop: top - (Platform.OS === 'ios' && top > 32 ? 10 : -10),
          paddingBottom: 10,
          flexDirection: 'row',
          // justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onPress={() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }}
      >
        <Image
          source={require('@/assets/images/header-logo-2.png')}
          style={{ width: 208 * LogoMultiplier, height: 28 * LogoMultiplier }}
          contentFit='contain'
          transition={150}
        />
        <BranchSelector />
      </Pressable>
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
          ref={flatListRef}
          contentContainerStyle={{
            paddingVertical: 8,
            paddingHorizontal: 2,
            gap: 12,
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
