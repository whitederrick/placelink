import { z } from "zod";

export const INGESTION_PROVIDERS = [
  "SEOUL_OPEN_DATA",
  "CULTURE_PORTAL",
  "KOPIS",
  "KOBIS",
  "OFFICIAL_SITE",
] as const;

export const PLACE_KINDS = [
  "CAFE",
  "RESTAURANT",
  "BAR",
  "SHOP",
  "CINEMA",
  "MUSEUM",
  "GALLERY",
  "PARK",
  "ACTIVITY",
  "CULTURAL_VENUE",
  "OTHER",
] as const;

export const HAPPENING_KINDS = [
  "EXHIBITION",
  "POPUP",
  "FESTIVAL",
  "PERFORMANCE",
  "SCREENING",
  "WORKSHOP",
  "EVENT",
  "OTHER",
] as const;

export const OPERATOR_TYPES = [
  "PUBLIC",
  "PRIVATE",
  "NONPROFIT",
  "UNKNOWN",
] as const;

export const ingestionListQuerySchema = z.object({
  status: z
    .enum(["NORMALIZED", "MERGED", "REJECTED", "FAILED"])
    .default("NORMALIZED"),
  provider: z.enum(INGESTION_PROVIDERS).optional(),
  happeningKind: z.enum(HAPPENING_KINDS).optional(),
  operatorType: z.enum(OPERATOR_TYPES).optional(),
  cursor: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).default(20),
});

export const ingestionReviewRequestSchema = z.discriminatedUnion("decision", [
  z
    .object({
      decision: z.literal("MERGE"),
      existingPlaceId: z.string().min(1).optional(),
      placeKind: z.enum(PLACE_KINDS).optional(),
      happeningKind: z.enum(HAPPENING_KINDS).optional(),
      operatorType: z.enum(OPERATOR_TYPES).optional(),
    })
    .strict(),
  z
    .object({
      decision: z.literal("REJECT"),
      reason: z.string().trim().min(3).max(300),
    })
    .strict(),
]);

export const ingestionReviewEntrySchema = z.object({
  id: z.string().min(1),
  provider: z.enum(INGESTION_PROVIDERS),
  externalId: z.string().min(1),
  status: z.enum(["NORMALIZED", "MERGED", "REJECTED", "FAILED"]),
  title: z.string().min(1).nullable(),
  placeName: z.string().min(1).nullable(),
  placeKind: z.enum(PLACE_KINDS).nullable(),
  happeningKind: z.enum(HAPPENING_KINDS).nullable(),
  operatorType: z.enum(OPERATOR_TYPES).nullable(),
  district: z.string().nullable(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  scheduleText: z.string().nullable(),
  officialUrl: z.string().url().nullable(),
  bookingUrl: z.string().url().nullable(),
  errorMessage: z.string().nullable(),
  fetchedAt: z.string().datetime(),
});

export const ingestionListResponseSchema = z.object({
  data: z.array(ingestionReviewEntrySchema),
  meta: z.object({ nextCursor: z.string().optional() }),
});

export const ingestionReviewResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    status: z.enum(["MERGED", "REJECTED"]),
    placeId: z.string().min(1).optional(),
    happeningId: z.string().min(1).optional(),
  }),
});

export type IngestionListQuery = z.infer<typeof ingestionListQuerySchema>;
export type IngestionReviewRequest = z.infer<
  typeof ingestionReviewRequestSchema
>;
export type IngestionReviewEntry = z.infer<
  typeof ingestionReviewEntrySchema
>;
