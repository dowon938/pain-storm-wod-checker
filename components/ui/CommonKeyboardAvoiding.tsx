import React, { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const behavior = Platform.OS === 'android' ? 'height' : 'padding';
const keyboardVerticalOffset = Platform.OS === 'android' ? 40 : 0;

const CommonKeyboardAvoiding = ({ children }: { children: ReactNode }) => {
  const { bottom } = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={behavior}
      style={{ flex: 1 }}
      keyboardVerticalOffset={bottom === 0 ? keyboardVerticalOffset : 0}>
      {children}
    </KeyboardAvoidingView>
  );
};

export default CommonKeyboardAvoiding;
