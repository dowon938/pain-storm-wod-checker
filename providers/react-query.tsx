import NetInfo from '@react-native-community/netinfo';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import React, { PropsWithChildren } from 'react';
import { AppState } from 'react-native';

// Keep a single client for the app lifetime
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60, // 1m
      gcTime: 1000 * 60 * 5, // 5m
    },
  },
});

// React Query online state from RN NetInfo
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

// Refetch on focus using AppState
focusManager.setEventListener((handleFocus) => {
  const onAppStateChange = (status: string) => {
    handleFocus(status === 'active');
  };
  const sub = AppState.addEventListener('change', onAppStateChange);
  return () => sub.remove();
});

export function ReactQueryProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
