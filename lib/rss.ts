import { XMLParser } from 'fast-xml-parser';
import { rssItemSchema, type RssItem } from './schemas';

const RSS_URL_PRIMARY = 'http://painstorm.co.kr/bbs/rss.php?bo_table=wod';
const RSS_URL_FALLBACK = 'http://painstorm.co.kr/bbs/board.php?bo_table=wod';

type RawRssItem = Record<string, unknown>;

function extractFirstImage(src?: string): string | undefined {
  if (!src) return undefined;
  const img = src.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img?.[1];
}

function coerceRssItem(raw: RawRssItem): RssItem | null {
  const title = typeof raw['title'] === 'string' ? raw['title'] : '';
  const link = typeof raw['link'] === 'string' ? raw['link'] : undefined;
  const description =
    typeof raw['description'] === 'string' ? raw['description'] : undefined;
  const pubDate =
    typeof raw['pubDate'] === 'string' ? raw['pubDate'] : undefined;
  const contentEncoded =
    typeof raw['content:encoded'] === 'string'
      ? raw['content:encoded']
      : undefined;
  const imageUrl = extractFirstImage(contentEncoded ?? description);

  const parsed = rssItemSchema.safeParse({
    title,
    link,
    description,
    pubDate,
    content: contentEncoded ?? description,
    imageUrl,
  });

  if (!parsed.success) return null;
  return parsed.data;
}

export async function fetchWodRss(): Promise<RssItem[]> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseTagValue: true,
    trimValues: true,
  });

  // Try primary RSS endpoint; fallback to HTML (will fail parse) just to surface helpful error
  const url = RSS_URL_PRIMARY;
  const response = await fetch(url);
  const text = await response.text();

  let json: any;
  try {
    json = parser.parse(text);
  } catch (e) {
    throw new Error('RSS 파싱 실패: 응답이 RSS 형식이 아닙니다.');
  }

  const items: RawRssItem[] =
    json?.rss?.channel?.item ?? json?.feed?.entry ?? [];

  if (!Array.isArray(items)) {
    // 단일 아이템 형태 처리
    const single = items ? [items as RawRssItem] : [];
    return single.map(coerceRssItem).filter(Boolean) as RssItem[];
  }

  return items.map(coerceRssItem).filter(Boolean) as RssItem[];
}
