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
