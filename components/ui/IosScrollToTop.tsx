import { useEffect, useRef } from 'react';
import { Platform, ScrollView, View } from 'react-native';

interface IOSScrollToTopProps {
  onStatusBarClicked: () => void;
}
export const IOSScrollToTop = ({ onStatusBarClicked }: IOSScrollToTopProps) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollWhenStatusBarTapped = useRef<boolean>(true);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: false });
  }, []);

  if (Platform.OS !== 'ios') {
    // This will not work on android
    return null;
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      scrollEventThrottle={16}
      onScroll={(e) => {
        // Check we dont scroll to top when we scrollToEnd
        if (
          e.nativeEvent.contentOffset.y < 1 &&
          scrollWhenStatusBarTapped.current
        ) {
          onStatusBarClicked();
          scrollWhenStatusBarTapped.current = false;
        }
      }}
      onScrollToTop={() => {
        // Once scrolled to top, reset ref and scroll back to bottom
        scrollWhenStatusBarTapped.current = true;
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }}
      style={{ height: 1, width: '100%', position: 'absolute' }}
    >
      <View style={{ height: 2 }} />
    </ScrollView>
  );
};
