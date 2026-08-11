import CommonWebview from '@/components/ui/CommonWebview';
import { StyleSheet, View } from 'react-native';

// 검색 화면.
// 입력창/지점 칩/닫기 버튼과 진입 애니메이션은 모두 웹(`/search`)이 소유한다.
// 이 화면은 웹뷰를 전체 화면으로 깔아주는 껍데기일 뿐이다.
// (예전엔 여기서 TextInput + 지점 칩을 네이티브로 그리고 브릿지로 웹에 값을 넘겼다.)

// 로딩 오버레이: 스플래시 대신 검정만(웹의 진입 애니메이션과 자연스럽게 이어짐).
// CommonWebview의 progressWrapper가 이미 검정 배경이라 아무것도 그리지 않아도 된다.
const BlackLoadingView = () => null;

export default function SearchScreen() {
  return (
    <View style={styles.screen}>
      <CommonWebview
        urlPath='/search'
        CustomLoadingView={BlackLoadingView}
        webKeyboardInput
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'black',
  },
});
