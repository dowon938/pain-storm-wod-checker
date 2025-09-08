import Webview from 'react-native-webview';

import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StackWebview() {
  const { detailId } = useLocalSearchParams<{ detailId: string }>();
  console.log(
    'url=>',
    `http://painstorm.co.kr/bbs/board.php?bo_table=wod&amp;${detailId}`
  );
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Webview
        style={{ flex: 1 }}
        source={{
          uri: `http://painstorm.co.kr/bbs/board.php?bo_table=wod&${detailId}`,
        }}
      />
    </SafeAreaView>
  );
}
