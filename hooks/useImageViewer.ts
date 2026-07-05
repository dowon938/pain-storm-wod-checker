import { createStore } from '@/lib/create-auto-store';

type ImageViewerState = {
  // 웹이 자체 이미지 뷰어를 열고 있는지 추적한다(네이티브 탭바 숨김 등에 사용).
  webImageViewerOpen: boolean;
};

const store = createStore<ImageViewerState>({
  webImageViewerOpen: false,
});

export const useWatchWebImageViewerOpen = store.useWatchWebImageViewerOpen;
export const updateWebImageViewerOpen = store.updateWebImageViewerOpen;
