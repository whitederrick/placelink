import { z } from "zod";

export const myCourseCardSchema = z.object({
  slug: z.string(),
  title: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "PRIVATE"]),
  durationMinutes: z.number().int().positive().nullable(),
  stops: z.number().int().nonnegative(),
  area: z.string().nullable(),
  updatedAt: z.string().datetime(),
  scrapCount: z.number().int().nonnegative(),
});

export const myOverviewSchema = z.object({
  profile: z.object({
    nickname: z.string(),
    coupleName: z.string().nullable(),
    memberInitials: z.array(z.string()).min(1).max(2),
    startedAt: z.string().datetime().nullable(),
    daysTogether: z.number().int().nonnegative().nullable(),
  }),
  stats: z.object({
    made: z.number().int().nonnegative(),
    saved: z.number().int().nonnegative(),
    received: z.number().int().nonnegative(),
  }),
  createdCourses: z.array(myCourseCardSchema),
  savedCourses: z.array(myCourseCardSchema),
});

export type MyOverview = z.infer<typeof myOverviewSchema>;
