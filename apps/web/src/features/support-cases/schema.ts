import { z } from "zod";

export const SUPPORT_CASE_TYPES = [
  "INQUIRY",
  "COMPLAINT",
  "REPORT",
  "PRIVACY",
] as const;
export const SUPPORT_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const SUPPORT_CASE_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_USER",
  "RESOLVED",
  "CLOSED",
] as const;

export const supportCaseListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  type: z.enum(SUPPORT_CASE_TYPES).optional(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  status: z.enum(SUPPORT_CASE_STATUSES).optional(),
  cursor: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).default(20),
});

const supportPersonSchema = z.object({
  id: z.string().min(1),
  nickname: z.string(),
  email: z.string().nullable(),
});

export const supportCaseSummarySchema = z.object({
  id: z.string().min(1),
  type: z.enum(SUPPORT_CASE_TYPES),
  priority: z.enum(SUPPORT_PRIORITIES),
  status: z.enum(SUPPORT_CASE_STATUSES),
  subject: z.string(),
  reporter: supportPersonSchema.nullable(),
  assignee: supportPersonSchema.nullable(),
  dueAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  entryCount: z.number().int().nonnegative(),
});

export const supportCaseListResponseSchema = z.object({
  data: z.array(supportCaseSummarySchema),
  meta: z.object({ nextCursor: z.string().optional() }),
});

export const supportCaseDetailResponseSchema = z.object({
  data: supportCaseSummarySchema.extend({
    description: z.string(),
    targetType: z.string().nullable(),
    targetId: z.string().nullable(),
    resolvedAt: z.string().datetime().nullable(),
    closedAt: z.string().datetime().nullable(),
    entries: z.array(
      z.object({
        id: z.string().min(1),
        kind: z.enum(["CUSTOMER_MESSAGE", "STAFF_REPLY", "INTERNAL_NOTE"]),
        authorId: z.string().min(1),
        authorType: z.enum(["HUMAN", "AGENT"]),
        body: z.string(),
        createdAt: z.string().datetime(),
      }),
    ),
  }),
});

export const supportCaseUpdateRequestSchema = z
  .object({
    status: z.enum(SUPPORT_CASE_STATUSES).optional(),
    priority: z.enum(SUPPORT_PRIORITIES).optional(),
    assignment: z.enum(["SELF", "UNASSIGNED"]).optional(),
    dueAt: z.string().datetime().nullable().optional(),
    reason: z.string().trim().min(3).max(500),
    expectedUpdatedAt: z.string().datetime(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.priority !== undefined ||
      value.assignment !== undefined ||
      value.dueAt !== undefined,
    { message: "At least one change is required" },
  );

export const supportCaseUpdateResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    status: z.enum(SUPPORT_CASE_STATUSES),
    priority: z.enum(SUPPORT_PRIORITIES),
    assigneeUserId: z.string().nullable(),
    dueAt: z.string().datetime().nullable(),
    updatedAt: z.string().datetime(),
  }),
});

export const supportCaseEntryRequestSchema = z.object({
  kind: z.enum(["STAFF_REPLY", "INTERNAL_NOTE"]),
  body: z.string().trim().min(3).max(5000),
});

export const supportCaseEntryResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    kind: z.enum(["STAFF_REPLY", "INTERNAL_NOTE"]),
    authorId: z.string().min(1),
    body: z.string(),
    createdAt: z.string().datetime(),
    caseUpdatedAt: z.string().datetime(),
  }),
});

export type SupportCaseListQuery = z.infer<typeof supportCaseListQuerySchema>;
export type SupportCaseUpdateRequest = z.infer<
  typeof supportCaseUpdateRequestSchema
>;
export type SupportCaseEntryRequest = z.infer<
  typeof supportCaseEntryRequestSchema
>;
