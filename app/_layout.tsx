import { HotUpdater, getUpdateSource } from '@hot-updater/react-native';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { usePushNotifications } from '@/hooks/usePushNotifications';
import { ReactQueryProvider } from '@/providers/react-query';
import { Text, View } from 'react-native';

function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
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
      </ThemeProvider>
    </ReactQueryProvider>
  );
}

export default HotUpdater.wrap({
  source: getUpdateSource(
    'https://painstorm-hot-updater-worker.dowon938.workers.dev/api/check-update',
    {
      updateStrategy: 'appVersion', // or "fingerprint"
    }
  ),
  requestHeaders: {
    // if you want to use the request headers, you can add them here
  },
  fallbackComponent: ({ progress, status }) => (
    <View
      style={{
        flex: 1,
        padding: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 1)',
      }}
    >
      {/* You can put a splash image here. */}
      <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
        {status === 'UPDATING' ? 'Updating...' : 'Checking for Update...'}
      </Text>
      {progress > 0 ? (
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
          {Math.round(progress * 100)}%
        </Text>
      ) : null}
    </View>
  ),
})(RootLayout);
