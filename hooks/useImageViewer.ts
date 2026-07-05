import { createStore } from '@/lib/create-auto-store';

type ImageViewerState = {
  visible: boolean;
  imageUrl?: string | string[];
  initialIndex?: number;
  webImageViewerOpen: boolean;
};

const store = createStore<ImageViewerState>({
  visible: false,
  imageUrl: undefined,
  initialIndex: undefined,
  webImageViewerOpen: false,
});

export const updateVisible = store.updateVisible;
export const useWatchVisible = store.useWatchVisible;

export const updateImageUrl = store.updateImageUrl;
export const useWatchImageUrl = store.useWatchImageUrl;
export const updateInitialIndex = store.updateInitialIndex;
export const useWatchInitialIndex = store.useWatchInitialIndex;

export const useWatchWebImageViewerOpen = store.useWatchWebImageViewerOpen;
export const updateWebImageViewerOpen = store.updateWebImageViewerOpen;

export function openImageViewer({
  url = '',
  initialIndex,
}: {
  url?: string | string[];
  initialIndex?: number;
}) {
  updateImageUrl?.(url);
  if (typeof initialIndex === 'number') updateInitialIndex?.(initialIndex);
  updateVisible(true);
}

export function closeImageViewer() {
  updateVisible(false);
  updateImageUrl?.(undefined);
  updateInitialIndex?.(undefined);
  // keep imageUrl to allow exit animation; caller can clear later if needed
}
