import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

import ImageViewerOverlay from '@/components/ImageViewerOverlay';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { ReactQueryProvider } from '@/providers/react-query';
import { LogBox } from 'react-native';

LogBox.ignoreAllLogs();

function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Heavitas: require('../assets/fonts/Heavitas.ttf'),
  });

  usePushNotifications();

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ReactQueryProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack>
          <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
          <Stack.Screen name='+not-found' />
        </Stack>
        <StatusBar style='light' />
        <ImageViewerOverlay />
      </ThemeProvider>
      <ReducedMotionConfig mode={ReduceMotion.Never} />
    </ReactQueryProvider>
  );
}

export default RootLayout;
// export default HotUpdater.wrap({
//   source: getUpdateSource(
//     'https://painstorm-hot-updater-worker.dowon938.workers.dev/api/check-update',
//     {
//       updateStrategy: 'appVersion', // or "fingerprint"
//     }
//   ),
//   requestHeaders: {
//     // if you want to use the request headers, you can add them here
//   },
//   fallbackComponent: ({ progress, status }) => (
//     <View
//       style={{
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         backgroundColor: 'rgba(0, 0, 0, 1)',
//       }}
//     >
//       <Image
//         source={require('../assets/images/splash-icon-3.png')}
//         style={{ width: 200, height: 200 }}
//         contentFit='contain'
//       />
//       <Text
//         style={{
//           color: 'rgba(255,255,255,0.7)',
//           fontSize: 12,
//           position: 'absolute',
//           bottom: 70,
//         }}
//       >
//         {status === 'UPDATING' ? 'Updating...' : 'Checking for Update...'}
//       </Text>
//       {progress > 0 ? (
//         <Text
//           style={{
//             color: 'rgba(255,255,255,0.6)',
//             fontSize: 12,
//             position: 'absolute',
//             bottom: 50,
//           }}
//         >
//           {Math.round(progress * 100)}%
//         </Text>
//       ) : null}
//     </View>
//   ),
// })(RootLayout);
