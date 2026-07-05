import CommonWebview from '@/components/ui/CommonWebview';
import { View } from 'react-native';

export default function HomeScreen() {
  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <CommonWebview urlPath={'/'} />
    </View>
  );
}
