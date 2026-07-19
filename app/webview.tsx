import { useLocalSearchParams } from 'expo-router';

import CommonWebview from '@/components/ui/CommonWebview';

// CommonWebview의 progressWrapper가 이미 검정 배경이라 로딩뷰는 비워둔다.
const BlackLoadingView = () => null;

/**
 * 범용 웹뷰 스택 화면.
 * 웹에서 DEEP_LINK({ deeplinkUrl })로 넘어온 내부 경로(path)를 그대로 로드한다.
 * 앞으로 어떤 화면이든 "웹 내부 경로 → 네이티브 스택 push"를 이 라우트로 공통 처리한다.
 */
export default function WebviewScreen() {
  const params = useLocalSearchParams<{ path: string }>();
  const path = Array.isArray(params.path) ? params.path[0] : params.path;
  if (!path || !path.startsWith('/')) return null;

  return (
    <CommonWebview
      urlPath={path}
      CustomLoadingView={BlackLoadingView}
      pullToRefreshEnabled={false}
    />
  );
}
