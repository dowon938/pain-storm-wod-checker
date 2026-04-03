import CommonWebview from '@/components/ui/CommonWebview';
import React from 'react';
import { View } from 'react-native';

export default function LocationScreen() {
  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <CommonWebview urlPath={'/record'} />
    </View>
  );
}
