import CommonWebview from '@/components/ui/CommonWebview';
import React from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LocationScreen() {
  const { top } = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        paddingTop: top - (Platform.OS === 'ios' && top > 32 ? 8 : -10),
      }}
    >
      <CommonWebview urlPath={'/record'} />
    </View>
  );
}
