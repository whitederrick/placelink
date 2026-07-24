import { z } from "zod";

export const scrapCourseSlugSchema = z.string().min(1).max(100);
export const scrapStatusResponseSchema = z.object({
  data: z.object({
    scrapped: z.boolean(),
    scrapCount: z.number().int().nonnegative(),
  }),
});

export type ScrapStatus = z.infer<typeof scrapStatusResponseSchema>["data"];
