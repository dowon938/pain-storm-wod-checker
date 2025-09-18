import { BlurView } from 'expo-blur';
import { Platform, StyleSheet } from 'react-native';

// Android/web fallback to a subtle translucent background to match floating style
export default function TabBarBackground() {
  if (Platform.OS === 'ios') {
    // iOS handled by .ios.tsx file via platform resolution
    return null as unknown as JSX.Element;
  }
  return (
    <BlurView tint='dark' intensity={50} style={StyleSheet.absoluteFill} />
  );
}

export function useBottomTabOverflow() {
  return 0;
}
