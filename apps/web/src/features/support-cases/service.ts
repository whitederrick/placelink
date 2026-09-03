import type { Actor } from "@/lib/auth/actor";
import { AppError, ErrorCode } from "@/lib/errors";
import {
  supportCaseDetailResponseSchema,
  supportCaseEntryRequestSchema,
  supportCaseEntryResponseSchema,
  supportCaseListQuerySchema,
  supportCaseListResponseSchema,
  supportCaseUpdateRequestSchema,
  supportCaseUpdateResponseSchema,
} from "./schema";
import {
  createSupportCaseEntryTransaction,
  selectSupportCase,
  selectSupportCases,
  updateSupportCaseTransaction,
} from "./queries";

function assertAdmin(actor: Actor) {
  if (actor.role !== "ADMIN")
    throw new AppError(ErrorCode.FORBIDDEN, "Admin permission required", 403);
}

function summary(
  record: Awaited<ReturnType<typeof selectSupportCases>>["records"][number],
) {
  return {
    id: record.id,
    type: record.type,
    priority: record.priority,
    status: record.status,
    subject: record.subject,
    reporter: record.reporter,
    assignee: record.assignee,
    dueAt: record.dueAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    entryCount: record._count.entries,
  };
}

export async function listSupportCases(actor: Actor, rawQuery: unknown = {}) {
  assertAdmin(actor);
  const query = supportCaseListQuerySchema.parse(rawQuery);
  const result = await selectSupportCases(query);
  return supportCaseListResponseSchema.parse({
    data: result.records.map(summary),
    meta: { nextCursor: result.nextCursor },
  });
}

export async function getSupportCase(actor: Actor, id: string) {
  assertAdmin(actor);
  const record = await selectSupportCase(id);
  if (!record)
    throw new AppError(
      ErrorCode.SUPPORT_CASE_NOT_FOUND,
      "Support case not found",
      404,
    );
  return supportCaseDetailResponseSchema.parse({
    data: {
      ...summary(record),
      description: record.description,
      targetType: record.targetType,
      targetId: record.targetId,
      resolvedAt: record.resolvedAt?.toISOString() ?? null,
      closedAt: record.closedAt?.toISOString() ?? null,
      entries: record.entries.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      })),
    },
  });
}

export async function updateSupportCase(
  actor: Actor,
  id: string,
  rawInput: unknown,
  now = new Date(),
) {
  assertAdmin(actor);
  const input = supportCaseUpdateRequestSchema.parse(rawInput);
  const result = await updateSupportCaseTransaction(actor, id, input, now);
  if (result.outcome === "not-found")
    throw new AppError(
      ErrorCode.SUPPORT_CASE_NOT_FOUND,
      "Support case not found",
      404,
    );
  if (result.outcome === "conflict")
    throw new AppError(
      ErrorCode.SUPPORT_CASE_CONFLICT,
      "Support case changed; reload and retry",
      409,
    );
  return supportCaseUpdateResponseSchema.parse({
    data: {
      ...result.record,
      dueAt: result.record.dueAt?.toISOString() ?? null,
      updatedAt: result.record.updatedAt.toISOString(),
    },
  });
}

export async function addSupportCaseEntry(
  actor: Actor,
  id: string,
  rawInput: unknown,
) {
  assertAdmin(actor);
  const input = supportCaseEntryRequestSchema.parse(rawInput);
  const entry = await createSupportCaseEntryTransaction(actor, id, input);
  if (!entry)
    throw new AppError(
      ErrorCode.SUPPORT_CASE_NOT_FOUND,
      "Support case not found",
      404,
    );
  return supportCaseEntryResponseSchema.parse({
    data: {
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      caseUpdatedAt: entry.caseUpdatedAt.toISOString(),
    },
  });
}
