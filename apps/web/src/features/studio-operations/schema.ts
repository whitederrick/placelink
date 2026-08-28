import { z } from "zod";

export const STUDIO_INGESTION_PROVIDERS = [
  "KAKAO",
  "NAVER",
  "GOOGLE",
  "TOUR_API",
  "SEOUL_OPEN_DATA",
  "CULTURE_PORTAL",
  "KOPIS",
  "KOBIS",
  "OFFICIAL_SITE",
] as const;

export const INGESTION_RUN_STATUSES = [
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
] as const;

export const ingestionRunListQuerySchema = z.object({
  provider: z.enum(STUDIO_INGESTION_PROVIDERS).optional(),
  status: z.enum(INGESTION_RUN_STATUSES).optional(),
  cursor: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).default(20),
});

export const ingestionRunSummarySchema = z.object({
  id: z.string().min(1),
  provider: z.enum(STUDIO_INGESTION_PROVIDERS),
  status: z.enum(INGESTION_RUN_STATUSES),
  trigger: z.enum(["MANUAL", "SCHEDULED"]),
  fetched: z.number().int().nonnegative(),
  selected: z.number().int().nonnegative(),
  inserted: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  totalAvailable: z.number().int().nonnegative().nullable(),
  errorMessage: z.string().nullable(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
});

export const ingestionRunListResponseSchema = z.object({
  data: z.array(ingestionRunSummarySchema),
  meta: z.object({ nextCursor: z.string().optional() }),
});

export const ingestionRunDetailResponseSchema = z.object({
  data: ingestionRunSummarySchema.extend({
    actorId: z.string().min(1),
    actorType: z.enum(["HUMAN", "AGENT"]),
    requestPayload: z.unknown(),
    records: z.array(
      z.object({
        id: z.string().min(1),
        externalId: z.string().min(1),
        status: z.enum([
          "STAGED",
          "NORMALIZED",
          "MERGED",
          "REJECTED",
          "FAILED",
        ]),
        title: z.string().nullable(),
        fetchedAt: z.string().datetime(),
      }),
    ),
  }),
});

export const studioDashboardResponseSchema = z.object({
  data: z.object({
    metrics: z.object({
      activeUsers: z.number().int().nonnegative(),
      newUsers7d: z.number().int().nonnegative(),
      recentActivity15m: z.number().int().nonnegative(),
      publishedCourses: z.number().int().nonnegative(),
      liveHappenings: z.number().int().nonnegative(),
      pendingIngestions: z.number().int().nonnegative(),
      failedRuns24h: z.number().int().nonnegative(),
    }),
    providers: z.array(
      z.object({
        provider: z.enum(STUDIO_INGESTION_PROVIDERS),
        status: z.enum(INGESTION_RUN_STATUSES).nullable(),
        inserted: z.number().int().nonnegative(),
        errorMessage: z.string().nullable(),
        startedAt: z.string().datetime().nullable(),
        finishedAt: z.string().datetime().nullable(),
      }),
    ),
    recentRuns: z.array(ingestionRunSummarySchema),
  }),
});

export type IngestionRunListQuery = z.infer<
  typeof ingestionRunListQuerySchema
>;
