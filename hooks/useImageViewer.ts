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
  webImageViewerOpen: boolean;
};

const store = createStore<ImageViewerState>({
  visible: false,
  imageUrl: undefined,
  initialIndex: undefined,
  webImageViewerOpen: false,
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
