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

export const STUDIO_USER_STATUSES = [
  "ACTIVE",
  "SUSPENDED",
  "WITHDRAWN",
] as const;

export const STUDIO_AUTH_PROVIDERS = ["KAKAO", "GOOGLE"] as const;

export const AUDIT_ACTOR_TYPES = ["HUMAN", "AGENT"] as const;

export const auditLogListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  actorType: z.enum(AUDIT_ACTOR_TYPES).optional(),
  targetType: z.string().trim().max(80).optional(),
  cursor: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).default(20),
});

export const auditLogListResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      actorId: z.string().min(1),
      actorType: z.enum(AUDIT_ACTOR_TYPES),
      action: z.string().min(1),
      targetType: z.string().min(1),
      targetId: z.string().min(1),
      before: z.unknown().nullable(),
      after: z.unknown().nullable(),
      createdAt: z.string().datetime(),
    }),
  ),
  meta: z.object({
    nextCursor: z.string().optional(),
    targetTypes: z.array(z.string()),
  }),
});

export const studioUserListQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  status: z.enum(STUDIO_USER_STATUSES).optional(),
  provider: z.enum(STUDIO_AUTH_PROVIDERS).optional(),
  cursor: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).default(20),
});

const studioUserCourseSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "PRIVATE", "DELETED"]),
  ownership: z.enum(["SOLO", "COUPLE"]),
  createdAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
});

export const studioUserSummarySchema = z.object({
  id: z.string().min(1),
  nickname: z.string(),
  email: z.string().nullable(),
  status: z.enum(STUDIO_USER_STATUSES),
  providers: z.array(z.enum(STUDIO_AUTH_PROVIDERS)),
  createdAt: z.string().datetime(),
  lastActiveAt: z.string().datetime().nullable(),
  courseCount: z.number().int().nonnegative(),
  scrapCount: z.number().int().nonnegative(),
  couple: z
    .object({
      id: z.string().min(1),
      displayName: z.string(),
      partnerNickname: z.string().nullable(),
    })
    .nullable(),
});

export const studioUserListResponseSchema = z.object({
  data: z.array(studioUserSummarySchema),
  meta: z.object({ nextCursor: z.string().optional() }),
});

export const studioUserDetailResponseSchema = z.object({
  data: studioUserSummarySchema.extend({
    profileImageUrl: z.string().nullable(),
    updatedAt: z.string().datetime(),
    deletedAt: z.string().datetime().nullable(),
    statusReason: z.string().nullable(),
    suspendedUntil: z.string().datetime().nullable(),
    statusChangedAt: z.string().datetime().nullable(),
    identities: z.array(
      z.object({
        provider: z.enum(STUDIO_AUTH_PROVIDERS),
        createdAt: z.string().datetime(),
      }),
    ),
    currentCouple: z
      .object({
        id: z.string().min(1),
        displayName: z.string(),
        status: z.enum(["ACTIVE", "DISSOLVED"]),
        startedAt: z.string().datetime(),
        joinedAt: z.string().datetime(),
        members: z.array(
          z.object({ id: z.string().min(1), nickname: z.string() }),
        ),
      })
      .nullable(),
    courses: z.array(studioUserCourseSchema),
    scraps: z.array(
      z.object({
        id: z.string().min(1),
        createdAt: z.string().datetime(),
        course: z.object({
          slug: z.string().min(1),
          title: z.string(),
          status: z.enum(["DRAFT", "PUBLISHED", "PRIVATE", "DELETED"]),
        }),
      }),
    ),
    recentActivity: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        createdAt: z.string().datetime(),
      }),
    ),
  }),
});

export const studioUserStatusUpdateRequestSchema = z
  .object({
    status: z.enum(STUDIO_USER_STATUSES),
    reason: z.string().trim().min(3).max(500),
    suspendedUntil: z.string().datetime().nullable().optional(),
    expectedUpdatedAt: z.string().datetime(),
  })
  .superRefine((input, context) => {
    if (input.status === "SUSPENDED" && input.suspendedUntil === undefined) {
      context.addIssue({
        code: "custom",
        path: ["suspendedUntil"],
        message: "Suspension end must be provided (null means indefinite)",
      });
    }
    if (input.status !== "SUSPENDED" && input.suspendedUntil) {
      context.addIssue({
        code: "custom",
        path: ["suspendedUntil"],
        message: "Only suspended users can have a suspension end",
      });
    }
  });

export const studioUserStatusUpdateResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    status: z.enum(STUDIO_USER_STATUSES),
    statusReason: z.string(),
    suspendedUntil: z.string().datetime().nullable(),
    statusChangedAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
});

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

export type IngestionRunListQuery = z.infer<typeof ingestionRunListQuerySchema>;
export type StudioUserListQuery = z.infer<typeof studioUserListQuerySchema>;
export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
export type StudioUserStatusUpdateRequest = z.infer<
  typeof studioUserStatusUpdateRequestSchema
>;
