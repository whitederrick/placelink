import { z } from "zod";

const courseEventPropertiesSchema = z.object({
  courseSlug: z.string().min(1).max(120),
  locale: z.enum(["ko", "en"]).optional(),
});

export const analyticsEventRequestSchema = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("course.viewed"),
    properties: courseEventPropertiesSchema,
  }),
  z.object({
    name: z.literal("course.shared"),
    properties: courseEventPropertiesSchema.extend({
      method: z.enum(["native", "clipboard"]),
    }),
  }),
  z.object({
    name: z.literal("filter.used"),
    properties: z.object({
      surface: z.enum(["home", "explore"]),
      filter: z.enum([
        "sort",
        "area",
        "situation",
        "budget",
        "mood",
        "category",
        "query",
      ]),
      value: z.string().min(1).max(120),
    }),
  }),
  z.object({
    name: z.literal("wizard.step_viewed"),
    properties: z.object({
      step: z.number().int().min(1).max(3),
      locale: z.enum(["ko", "en"]),
    }),
  }),
  z.object({
    name: z.literal("map.area_searched"),
    properties: z.object({
      locale: z.enum(["ko", "en"]),
      category: z.string().min(1).max(40).optional(),
    }),
  }),
]);

export type AnalyticsEventRequest = z.infer<typeof analyticsEventRequestSchema>;

export const analyticsSummaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
});

export const analyticsSummarySchema = z.object({
  range: z.object({
    days: z.number().int().positive(),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
  }),
  totals: z.object({
    current: z.number().int().nonnegative(),
    previous: z.number().int().nonnegative(),
    authenticated: z.number().int().nonnegative(),
    changePercent: z.number().nullable(),
  }),
  events: z.array(
    z.object({
      name: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  filters: z.object({
    count: z.number().int().nonnegative(),
    lastUsedAt: z.string().datetime().nullable(),
  }),
  monitoring: z.object({
    status: z.enum(["healthy", "idle", "stale"]),
    lastEventAt: z.string().datetime().nullable(),
  }),
  latest: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      createdAt: z.string().datetime(),
      authenticated: z.boolean(),
    }),
  ),
});

export type AnalyticsSummaryQuery = z.infer<typeof analyticsSummaryQuerySchema>;
export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;
