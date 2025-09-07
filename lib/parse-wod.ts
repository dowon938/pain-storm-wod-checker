import { z } from 'zod';
import {
  type RssItem,
  wodBranchSchema,
  type WodEntry,
  wodEntrySchema,
} from './schemas';

function stripHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>(\r?\n)?/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u00a0/g, ' ')
    .trim();
}

const branchNames = ['압구정', '잠실', '수원', '아차산'] as const;

function detectBranch(label: string): z.infer<typeof wodBranchSchema> {
  const clean = label.replace(/[\[\]]/g, '').trim();
  if (branchNames.includes(clean as any)) return clean as any;
  return '기타';
}

export function expandWodEntriesFromRss(item: RssItem): WodEntry[] {
  const content = stripHtml(item.content ?? item.description);
  const title = item.title ?? 'WOD';

  // 날짜/타이틀 라벨 (예: "Saturday 250906")
  const dateLabelMatch = title.match(/\b(\d{6}|\d{8})\b/);
  const dateLabel = dateLabelMatch ? dateLabelMatch[1] : title;

  // 지점 블록 추출: "[ 압구정 ] ... (다음 [ ... ] 전까지)"
  const blocks: Array<{ branch: string; text: string }> = [];
  const regex = /\[\s*([^\]]+?)\s*\][\t ]*\n?([\s\S]*?)(?=\n\s*\[|$)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    const branch = m[1];
    const text = m[2].trim();
    if (branch && text) blocks.push({ branch, text });
  }

  // 블록이 없으면 전체를 기타로 처리
  if (blocks.length === 0) {
    const lines = content
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const entry: WodEntry = {
      id: `${dateLabel}__기타`,
      dateLabel,
      title,
      branch: '기타',
      lines,
    };
    return [wodEntrySchema.parse(entry)];
  }

  const entries: WodEntry[] = blocks.map((b) => {
    const lines = b.text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const branch = detectBranch(b.branch);
    const entry: WodEntry = {
      id: `${dateLabel}__${branch}`,
      dateLabel,
      title,
      branch,
      lines,
    };
    return wodEntrySchema.parse(entry);
  });

  return entries;
}
