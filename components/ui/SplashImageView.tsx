import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 1)',
  },
  image: {
    width: 200,
    height: 200,
  },
});

const SplashImageView = ({ children }: { children?: React.ReactNode }) => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/splash-icon-3.png')}
        style={styles.image}
        contentFit='contain'
      />
      {children}
    </View>
  );
};

export default SplashImageView;
