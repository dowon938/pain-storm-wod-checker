import { usePushNotifications } from '@/hooks/usePushNotifications';
import { ReactQueryProvider } from '@/providers/react-query';
import { HotUpdater } from '@hot-updater/react-native';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { setOptions } from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

LogBox.ignoreAllLogs();

setOptions({ fade: true, duration: 400 });

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
          <Stack.Screen
            name='outerlink'
            options={{
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name='search'
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen name='+not-found' />
        </Stack>
        <StatusBar style='light' />
      </ThemeProvider>
      <ReducedMotionConfig mode={ReduceMotion.Never} />
    </ReactQueryProvider>
  );
}

// export default RootLayout;
export default HotUpdater.wrap({
  baseURL:
    'https://painstorm-hot-updater-worker.dowon938.workers.dev/api/check-update',
  updateStrategy: 'appVersion', // or "fingerprint"
  requestHeaders: {
    // if you want to use the request headers, you can add them here
  },
})(RootLayout);
