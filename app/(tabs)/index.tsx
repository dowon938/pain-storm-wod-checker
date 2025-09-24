import CommonWebview from '@/components/ui/CommonWebview';
import { createStore } from '@/lib/create-auto-store';
import React from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const {
  readGlobalRefetchWods,
  updateGlobalRefetchWods,
  useWatchGlobalRefetchWods,
} = createStore({
  globalRefetchWods: () => {},
});

export default function HomeScreen() {
  const { top } = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        paddingTop: top - (Platform.OS === 'ios' && top > 32 ? 8 : -10),
      }}
    >
      <CommonWebview urlPath={'/'} />
    </View>
  );
}
