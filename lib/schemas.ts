import { z } from 'zod';

export const wodBranchSchema = z.union([
  z.literal('압구정'),
  z.literal('잠실'),
  z.literal('수원'),
  z.literal('아차산'),
  z.literal('기타'),
]);

export type WodBranch = z.infer<typeof wodBranchSchema>;

export const rssItemSchema = z.object({
  title: z.string(),
  link: z.string().optional(),
  description: z.string().optional(),
  pubDate: z.string().optional(),
  content: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export type RssItem = z.infer<typeof rssItemSchema>;

export const wodEntrySchema = z.object({
  id: z.string(),
  dateLabel: z.string(),
  title: z.string(),
  branch: wodBranchSchema,
  lines: z.array(z.string()),
  imageUrl: z.string().url().optional(),
});

export type WodEntry = z.infer<typeof wodEntrySchema>;

export type WodDateGroup = {
  dateLabel: string;
  imageUrl?: string;
  entries: WodEntry[];
};
