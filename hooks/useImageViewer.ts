import { createStore } from '@/lib/create-auto-store';

export type ImageViewerOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ImageViewerState = {
  visible: boolean;
  imageUrl?: string;
  origin?: ImageViewerOrigin;
};

const store = createStore<ImageViewerState>({
  visible: false,
  imageUrl: undefined,
});

export const readVisible = store.readVisible;
export const updateVisible = store.updateVisible;
export const useWatchVisible = store.useWatchVisible;

export const readImageUrl = store.readImageUrl;
export const updateImageUrl = store.updateImageUrl;
export const useWatchImageUrl = store.useWatchImageUrl;

export function openImageViewer({ url = '' }) {
  updateImageUrl?.(url);
  updateVisible(true);
}

export function closeImageViewer() {
  updateVisible(false);
  // keep imageUrl to allow exit animation; caller can clear later if needed
}
