import { z } from "zod";

export const courseLocaleSchema = z.enum(["ko", "en"]);
export const anchorListQuerySchema = z.object({
  locale: courseLocaleSchema.default("ko"),
  cursor: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).default(20),
});

export const courseAnchorSchema = z.object({
  happeningId: z.string(),
  title: z.string(),
  period: z.string(),
  dDay: z.string(),
  place: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    area: z.string().nullable(),
    lat: z.number(),
    lng: z.number(),
  }),
});

export const anchorListResponseSchema = z.object({
  data: z.array(courseAnchorSchema),
  meta: z.object({ nextCursor: z.string().optional() }),
});

export const createCourseDraftRequestSchema = z.object({
  locale: courseLocaleSchema,
  anchorHappeningId: z.string().min(1),
});

export const createCourseDraftResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    slug: z.string(),
    status: z.literal("DRAFT"),
    title: z.string(),
    anchor: courseAnchorSchema,
  }),
});

export const courseDraftNodeSchema = z.object({
  id: z.string(),
  orderIndex: z.number().int().nonnegative(),
  tip: z.string().max(50).nullable(),
  distanceMeters: z.number().int().nonnegative().nullable(),
  walkMinutes: z.number().int().nonnegative().nullable(),
  place: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    area: z.string().nullable(),
    category: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
});

export const courseDraftSchema = z.object({
  id: z.string(),
  slug: z.string(),
  status: z.literal("DRAFT"),
  title: z.string(),
  ownerName: z.string(),
  nodes: z.array(courseDraftNodeSchema).min(1).max(8),
});

export const courseDraftResponseSchema = z.object({ data: courseDraftSchema });

export const updateCourseDraftRequestSchema = z
  .object({
    nodes: z
      .array(
        z.object({
          placeId: z.string().min(1),
          tip: z.string().trim().max(50).nullable().optional(),
        }),
      )
      .min(1)
      .max(8),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.nodes.map((node) => node.placeId)).size !==
      input.nodes.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Course places must be unique",
        path: ["nodes"],
      });
    }
  });

export const updateCourseDraftResponseSchema = courseDraftResponseSchema;

export const publishCourseRequestSchema = z.object({
  title: z.string().trim().min(3).max(60),
  description: z.string().trim().max(160).nullable().optional(),
});

export const publishCourseResponseSchema = z.object({
  data: z.object({
    slug: z.string(),
    status: z.literal("PUBLISHED"),
    publishedAt: z.string().datetime(),
  }),
});

export const publicCourseSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  ownerName: z.string(),
  durationMinutes: z.number().int().positive(),
  scrapCount: z.number().int().nonnegative(),
  publishedAt: z.string().datetime(),
  tags: z.array(z.string()),
  nodes: z
    .array(
      courseDraftNodeSchema.extend({
        happening: z
          .object({
            status: z.enum(["UPCOMING", "ACTIVE", "ENDED"]),
            startsAt: z.string().datetime(),
            endsAt: z.string().datetime(),
          })
          .nullable(),
      }),
    )
    .min(1)
    .max(8),
});

export type AnchorListQuery = z.infer<typeof anchorListQuerySchema>;
export type CourseAnchor = z.infer<typeof courseAnchorSchema>;
export type CreateCourseDraftRequest = z.infer<
  typeof createCourseDraftRequestSchema
>;
export type CourseDraft = z.infer<typeof courseDraftSchema>;
export type CourseDraftNode = z.infer<typeof courseDraftNodeSchema>;
export type UpdateCourseDraftRequest = z.infer<
  typeof updateCourseDraftRequestSchema
>;
export type PublishCourseRequest = z.infer<typeof publishCourseRequestSchema>;
export type PublicCourse = z.infer<typeof publicCourseSchema>;
