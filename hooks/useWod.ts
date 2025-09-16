import { expandWodEntriesFromRss } from '@/lib/parse-wod';
import {
  fetchWodRss,
  fetchWodThumbnailFromFallbackHtml,
  type ImageItem,
} from '@/lib/rss';
import { WodItem, type WodDateGroup, type WodEntry } from '@/lib/schemas';
import { useQuery } from '@tanstack/react-query';

export function useWodList() {
  return useQuery<{ items: WodEntry[] }, Error>({
    queryKey: ['wod', 'rss'],
    queryFn: async () => {
      const rss = await fetchWodRss();
      const entries = rss.flatMap(expandWodEntriesFromRss);
      // 최신이 위로 오게 정렬 (title의 날짜 라벨 기준)
      const sorted = entries.sort((a, b) =>
        a.dateLabel < b.dateLabel ? 1 : -1
      );
      return { items: sorted };
    },
  });
}

export function useWodGroupedByDate() {
  return useQuery<{ groups: WodDateGroup[] }, Error>({
    queryKey: ['wod', 'rss', 'grouped-by-date'],
    queryFn: async () => {
      const rss = await fetchWodRss();
      // const thumbnails = await fetchWodThumbnailFromFallbackHtml();

      const sorted = rss.flatMap(expandWodEntriesFromRss);
      // 날짜 desc 정렬 후 그룹핑
      // const sorted = entries.sort((a, b) =>
      //   a.dateLabel < b.dateLabel ? 1 : -1
      // );
      const map = new Map<string, WodDateGroup>();
      for (const e of sorted) {
        const g = map.get(e.dateLabel) ?? {
          title: e.title,
          dateLabel: e.dateLabel,
          // imageUrl: thumbnails[e.link ?? ''],
          entries: [],
        };
        // 그룹 이미지가 없고 엔트리에 있으면 채움
        if (!g.imageUrl && e.imageUrl) g.imageUrl = e.imageUrl;
        g.entries.push(e);
        map.set(e.dateLabel, g);
      }
      const groups = Array.from(map.values());

      return { groups };
    },
  });
}
export function useWodThumbnails() {
  return useQuery<{ thumbnails: ImageItem }, Error>({
    queryKey: ['wod', 'thumbnails'],
    queryFn: async () => {
      const thumbnails = await fetchWodThumbnailFromFallbackHtml();
      return { thumbnails };
    },
  });
}

export function useWods() {
  return useQuery<{ wodItems: WodItem[] }, Error>({
    queryKey: ['wods'],
    queryFn: async () => {
      const res = await fetch(
        'https://painstorm-push-noti.dowon938.workers.dev/wod.json',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const json = await res.json();

      return { wodItems: json?.items ?? [] };
    },
  });
}
