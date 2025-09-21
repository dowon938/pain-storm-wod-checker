import LogoHeader from '@/components/ui/LogoHeader';
import BranchSelector from '@/components/wod/BranchSelector';
import WodDateGroupCard from '@/components/wod/WodDateGroupCard';
import { useWods } from '@/hooks/useWod';
import { createStore } from '@/lib/create-auto-store';
import { WodItem } from '@/lib/schemas';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

export const {
  readGlobalRefetchWods,
  updateGlobalRefetchWods,
  useWatchGlobalRefetchWods,
} = createStore({
  globalRefetchWods: () => {},
});

export default function HomeScreen() {
  const { bottom } = useSafeAreaInsets();
  const { data, isLoading, isRefetching, refetch, error } = useWods();
  const flatListRef = useRef<FlatList<WodItem>>(null);

  useEffect(() => {
    updateGlobalRefetchWods(refetch);
  }, [refetch]);

  const insetBottom = Platform.OS === 'ios' ? 24 : bottom + 8;
  const bottomTabHeight = insetBottom + 52;

  const onPressScrollTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: WodItem }) => <WodDateGroupCard wodItem={item} />,
    []
  );
  const keyExtractor = useCallback((item: WodItem) => item.id, []);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={[]}>
      <LogoHeader onPress={onPressScrollTop}>
        <BranchSelector />
      </LogoHeader>
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
            paddingBottom: bottomTabHeight + 8,
            gap: 12,
          }}
          data={data?.wodItems || []}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          initialNumToRender={4}
          windowSize={8}
          maxToRenderPerBatch={8}
          // updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} />
          }
        />
      )}
    </SafeAreaView>
  );
}
