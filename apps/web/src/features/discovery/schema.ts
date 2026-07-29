import { z } from "zod";

export const homeFeedLocaleSchema = z.enum(["ko", "en"]);
export type HomeFeedLocale = z.infer<typeof homeFeedLocaleSchema>;

export const homeFeedQuerySchema = z.object({
  locale: homeFeedLocaleSchema.default("ko"),
  cursor: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(["latest", "popular"]).default("latest"),
  area: z
    .enum(["seongsu", "yeonnam", "seochon", "hannam", "mangwon"])
    .optional(),
  situation: z.string().min(1).max(60).optional(),
  budget: z.string().min(1).max(60).optional(),
  mood: z.string().min(1).max(60).optional(),
});

export const happeningSchema = z.object({
  id: z.string(),
  neighborhood: z.string(),
  title: z.string(),
  period: z.string(),
  dDay: z.string(),
  tone: z.enum(["lime", "pink", "blue"]),
});

export const courseCardSchema = z.object({
  slug: z.string(),
  coupleName: z.string(),
  neighborhood: z.string(),
  duration: z.string(),
  stops: z.number().int().positive(),
  scraps: z.number().int().nonnegative(),
  views: z.number().int().nonnegative(),
  tags: z.array(z.string()),
  tone: z.enum(["sunset", "mono", "violet"]),
});

export const homeFilterOptionSchema = z.object({
  slug: z.string(),
  label: z.string(),
});

export const hallOfFameEntrySchema = courseCardSchema.extend({
  rank: z.number().int().positive(),
  weeklyScraps: z.number().int().nonnegative(),
  score: z.number().int().nonnegative(),
});

export const homeFeedSchema = z.object({
  happenings: z.array(happeningSchema),
  courses: z.array(courseCardSchema),
  hallOfFame: z.array(hallOfFameEntrySchema),
  filters: z.object({
    situations: z.array(homeFilterOptionSchema),
    budgets: z.array(homeFilterOptionSchema),
    moods: z.array(homeFilterOptionSchema),
  }),
});

export const homeFeedResponseSchema = z.object({
  data: homeFeedSchema,
  meta: z.object({ nextCursor: z.string().optional() }),
});

export type HomeFeed = z.infer<typeof homeFeedSchema>;
export type HomeFeedQuery = z.infer<typeof homeFeedQuerySchema>;
