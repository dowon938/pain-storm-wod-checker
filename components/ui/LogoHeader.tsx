import { Image } from 'expo-image';
import React, { memo } from 'react';
import { Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LogoMultiplier = 0.95;

const LogoHeader = ({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) => {
  const { top } = useSafeAreaInsets();
  console.log('LogoHeader');
  return (
    <Pressable
      style={{
        padding: 12,
        paddingTop: top - (Platform.OS === 'ios' && top > 32 ? 8 : -10),
        paddingBottom: 6,
        flexDirection: 'row',
        // justifyContent: 'space-between',
        alignItems: 'center',
      }}
      onPress={onPress}
    >
      <Image
        source={require('@/assets/images/header-logo-2.png')}
        style={{ width: 208 * LogoMultiplier, height: 28 * LogoMultiplier }}
        contentFit='contain'
        transition={150}
      />
      {children}
    </Pressable>
  );
};

export default memo(LogoHeader);
