import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';

import Constants from 'expo-constants';

import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { useIsNavigationReady } from './useNavigationReady';

const PREV_EXPO_PUSH_TOKEN = 'expoPushToken';
const storage = new MMKV();
const getPrevExpoPushToken = () => {
  return storage.getString(PREV_EXPO_PUSH_TOKEN);
};
const setPrevExpoPushToken = (token: string) => {
  storage.set(PREV_EXPO_PUSH_TOKEN, token);
};

export interface PushNotificationState {
  expoPushToken?: Notifications.ExpoPushToken['data'];
  notification?: Notifications.Notification;
}

export const usePushNotifications = (): PushNotificationState => {
  Notifications.setNotificationHandler({
    handleNotification:
      async (): Promise<Notifications.NotificationBehavior> => {
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
  });

  const [expoPushToken, setExpoPushToken] = useState<
    Notifications.ExpoPushToken['data'] | undefined
  >();

  // const [notification, setNotification] = useState<
  //   Notifications.Notification | undefined
  // >();

  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 10, 150, 10],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('알림 권한을 가져오지 못했습니다.');
        return;
      }

      // Learn more about projectId:
      // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
      // EAS projectId is used here.
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        // console.log(token);
      } catch (e) {
        token = `${e}`;
      }
    } else {
      console.log('실제 디바이스에서만 푸시 알림을 사용할 수 있습니다.');
    }

    return token;
  }

  const router = useRouter();

  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      console.log(
        'NotificationResponsePath=>',
        response?.notification?.request?.content?.data?.path
      );
      switch (response?.notification?.request?.content?.data?.path) {
        case '/wods':
          router.navigate('/(tabs)');
          break;
        case '/location':
          router.navigate('/(tabs)/location');
          break;
        default:
          router.navigate('/(tabs)');
      }
    },
    [router]
  );

  useEffect(() => {
    // 푸시가 왔을떄
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        // console.log('notification', notification);
        // setNotification(notification);
      });
    // 푸시가 클릭됐을떄
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationResponse(response);
      });

    return () => {
      notificationListener.current?.remove();

      responseListener.current?.remove();
    };
  }, [handleNotificationResponse]);

  const isNavigationReady = useIsNavigationReady();

  // 푸시로 앱오픈시 처리
  useEffect(() => {
    if (isNavigationReady) {
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response?.notification) {
          return;
        }
        if (router.canGoBack()) return;
        handleNotificationResponse(response);
      });
    }
  }, [isNavigationReady, handleNotificationResponse, router]);

  useEffect(() => {
    registerForPushNotificationsAsync().then(async (token) => {
      if (token?.startsWith('ExponentPushToken[')) {
        setExpoPushToken(token);
        if (getPrevExpoPushToken() === token) {
          if (__DEV__) {
            console.log('이미 푸시 토큰이 있습니다.', token);
          }
          return;
        } else {
          if (__DEV__) {
            console.log('푸시 토큰이 변경되었습니다.', token);
          }
          setPrevExpoPushToken(token);
          try {
            // const res =
            await fetch(
              'https://painstorm-push-noti.dowon938.workers.dev/tokens',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expoToken: token }), // 또는 userId 생기면 실제 값
              }
            );
            // const data = await res.json();
            // console.log(data);
          } catch (error) {
            console.log('send token error', error);
          }
        }
      }
    });
  }, []);

  return {
    expoPushToken: expoPushToken,
    // notification,
  };
};
