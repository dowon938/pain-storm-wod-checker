import { createStore } from '@/lib/create-auto-store';

export type ImageViewerOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ImageViewerState = {
  visible: boolean;
  imageUrl?: string | string[];
  origin?: ImageViewerOrigin;
  initialIndex?: number;
};

const store = createStore<ImageViewerState>({
  visible: false,
  imageUrl: undefined,
  initialIndex: undefined,
});

export const readVisible = store.readVisible;
export const updateVisible = store.updateVisible;
export const useWatchVisible = store.useWatchVisible;

export const readImageUrl = store.readImageUrl;
export const updateImageUrl = store.updateImageUrl;
export const useWatchImageUrl = store.useWatchImageUrl;
export const readInitialIndex = store.readInitialIndex;
export const updateInitialIndex = store.updateInitialIndex;
export const useWatchInitialIndex = store.useWatchInitialIndex;

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
  // keep imageUrl to allow exit animation; caller can clear later if needed
}
