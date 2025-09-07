import { expandWodEntriesFromRss } from '@/lib/parse-wod';
import { fetchWodRss } from '@/lib/rss';
import { type WodEntry } from '@/lib/schemas';
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
