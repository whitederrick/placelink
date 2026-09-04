import { getDatabase } from "@placelink/database";
import type { Actor } from "@/lib/auth/actor";
import type {
  CustomerSupportCaseRequest,
  SupportCaseEntryRequest,
  SupportCaseListQuery,
  SupportCaseUpdateRequest,
} from "./schema";

export function countRecentSupportCasesByReporter(
  reporterUserId: string,
  since: Date,
) {
  return getDatabase().supportCase.count({
    where: { reporterUserId, createdAt: { gte: since } },
  });
}

export function insertCustomerSupportCase(
  actor: Actor,
  input: CustomerSupportCaseRequest,
) {
  return getDatabase().$transaction(async (transaction) => {
    const supportCase = await transaction.supportCase.create({
      data: {
        reporterUserId: actor.id,
        type: input.type,
        subject: input.subject,
        description: input.description,
        targetType: input.targetType,
        targetId: input.targetId,
        entries: {
          create: {
            kind: "CUSTOMER_MESSAGE",
            authorId: actor.id,
            authorType: actor.type,
            body: input.description,
          },
        },
      },
      select: { id: true, createdAt: true },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        actorType: actor.type,
        action: "support_case.created",
        targetType: "SupportCase",
        targetId: supportCase.id,
        after: {
          type: input.type,
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
        },
      },
    });
    return supportCase;
  });
}

const personSelect = { id: true, nickname: true, email: true } as const;
const summarySelect = {
  id: true,
  type: true,
  priority: true,
  status: true,
  subject: true,
  reporter: { select: personSelect },
  assignee: { select: personSelect },
  dueAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { entries: true } },
} as const;

export async function selectSupportCases(query: SupportCaseListQuery) {
  const search = query.search || undefined;
  const records = await getDatabase().supportCase.findMany({
    where: {
      type: query.type,
      priority: query.priority,
      status: query.status,
      OR: search
        ? [
            { id: { contains: search, mode: "insensitive" } },
            { subject: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            {
              reporter: { nickname: { contains: search, mode: "insensitive" } },
            },
            { reporter: { email: { contains: search, mode: "insensitive" } } },
          ]
        : undefined,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0,
    take: query.take + 1,
    select: summarySelect,
  });
  const hasNext = records.length > query.take;
  const page = hasNext ? records.slice(0, query.take) : records;
  return { records: page, nextCursor: hasNext ? page.at(-1)?.id : undefined };
}

export function selectSupportCase(id: string) {
  return getDatabase().supportCase.findUnique({
    where: { id },
    select: {
      ...summarySelect,
      description: true,
      targetType: true,
      targetId: true,
      resolvedAt: true,
      closedAt: true,
      entries: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          kind: true,
          authorId: true,
          authorType: true,
          body: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function updateSupportCaseTransaction(
  actor: Actor,
  id: string,
  input: SupportCaseUpdateRequest,
  now: Date,
) {
  return getDatabase().$transaction(async (transaction) => {
    const before = await transaction.supportCase.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        priority: true,
        assigneeUserId: true,
        dueAt: true,
        updatedAt: true,
        resolvedAt: true,
        closedAt: true,
      },
    });
    if (!before) return { outcome: "not-found" as const };
    const assigneeUserId =
      input.assignment === "SELF"
        ? actor.id
        : input.assignment === "UNASSIGNED"
          ? null
          : before.assigneeUserId;
    const status = input.status ?? before.status;
    const resolvedAt =
      status === "RESOLVED" || status === "CLOSED"
        ? (before.resolvedAt ?? now)
        : null;
    const closedAt = status === "CLOSED" ? (before.closedAt ?? now) : null;
    const result = await transaction.supportCase.updateMany({
      where: { id, updatedAt: new Date(input.expectedUpdatedAt) },
      data: {
        status: input.status,
        priority: input.priority,
        assigneeUserId,
        dueAt:
          input.dueAt === undefined
            ? undefined
            : input.dueAt
              ? new Date(input.dueAt)
              : null,
        resolvedAt,
        closedAt,
      },
    });
    if (result.count !== 1) return { outcome: "conflict" as const };
    const after = await transaction.supportCase.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        status: true,
        priority: true,
        assigneeUserId: true,
        dueAt: true,
        updatedAt: true,
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        actorType: actor.type,
        action: "support_case.updated",
        targetType: "SupportCase",
        targetId: id,
        before: {
          status: before.status,
          priority: before.priority,
          assigneeUserId: before.assigneeUserId,
          dueAt: before.dueAt?.toISOString() ?? null,
        },
        after: {
          status: after.status,
          priority: after.priority,
          assigneeUserId: after.assigneeUserId,
          dueAt: after.dueAt?.toISOString() ?? null,
          reason: input.reason,
        },
      },
    });
    return { outcome: "updated" as const, record: after };
  });
}

export async function createSupportCaseEntryTransaction(
  actor: Actor,
  id: string,
  input: SupportCaseEntryRequest,
) {
  return getDatabase().$transaction(async (transaction) => {
    const exists = await transaction.supportCase.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) return null;
    const entry = await transaction.supportCaseEntry.create({
      data: {
        supportCaseId: id,
        kind: input.kind,
        authorId: actor.id,
        authorType: actor.type,
        body: input.body,
      },
      select: {
        id: true,
        kind: true,
        authorId: true,
        body: true,
        createdAt: true,
      },
    });
    const supportCase = await transaction.supportCase.update({
      where: { id },
      data: { updatedAt: new Date() },
      select: { updatedAt: true },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        actorType: actor.type,
        action:
          input.kind === "STAFF_REPLY"
            ? "support_case.reply_added"
            : "support_case.note_added",
        targetType: "SupportCase",
        targetId: id,
        after: { entryId: entry.id, kind: entry.kind },
      },
    });
    return { ...entry, caseUpdatedAt: supportCase.updatedAt };
  });
}
