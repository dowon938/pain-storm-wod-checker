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
      {/* <Text
        style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 12,
          position: 'absolute',
          bottom: 70,
        }}
      >
        {status === 'UPDATING' ? 'Updating...' : 'Checking for Update...'}
      </Text> */}
      {/* {progress > 0 ? (
        <Text
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 12,
            position: 'absolute',
            bottom: 50,
          }}
        >
          {Math.round(progress * 100)}%
        </Text>
      ) : null} */}
    </View>
  );
};

export default SplashImageView;
