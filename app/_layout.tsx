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
    // 웹(pain-storm-wod-web) 본문 폰트 페이퍼로지: 본문 400 / 강조 800
    Paperlogy: require('../assets/fonts/Paperlogy-4Regular.ttf'),
    PaperlogyExtraBold: require('../assets/fonts/Paperlogy-8ExtraBold.ttf'),
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
          {/* 검색: 아래→위 애니메이션은 유지하되 모달이 아니라 일반 스택 카드로 둔다.
              (fullScreenModal 위로 card를 push하면 프레젠테이션이 중첩돼 상세 이동이
               불안정 → card로 두면 상세 push가 표준 스택 이동이라 안정적) */}
          <Stack.Screen
            name='search'
            options={{
              headerShown: false,
              presentation: 'card',
              animation: 'fade_from_bottom',
              // 닫기는 X 버튼으로만. 세로 제스처는 결과 리스트 스크롤과
              // 상시 충돌해서 끈다(가장자리 스트립만 잡혀 오히려 혼란).
              gestureEnabled: false,
            }}
          />
          {/* 범용 웹뷰 스택. 웹 DEEP_LINK로 열리는 상세 등을 네이티브 스택으로 push */}
          <Stack.Screen
            name='webview'
            options={{
              headerShown: false,
              presentation: 'card',
              animation: 'slide_from_right',
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
