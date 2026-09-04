import {
  normalizedCulturalEventSchema,
  type ExternalProvider,
} from "@placelink/database";
import type { Actor } from "@/lib/auth/actor";
import { requireStudioPermission } from "@/lib/auth/permissions";
import { AppError, ErrorCode } from "@/lib/errors";
import {
  auditLogListQuerySchema,
  auditLogListResponseSchema,
  expiredSuspensionRecoveryResponseSchema,
  ingestionRunDetailResponseSchema,
  ingestionRunListQuerySchema,
  ingestionRunListResponseSchema,
  studioDashboardResponseSchema,
  studioUserDetailResponseSchema,
  studioUserListQuerySchema,
  studioUserListResponseSchema,
  studioUserStatusUpdateRequestSchema,
  studioUserStatusUpdateResponseSchema,
  studioOperatorListQuerySchema,
  studioOperatorListResponseSchema,
  studioOperatorUpdateRequestSchema,
  studioOperatorUpdateResponseSchema,
} from "./schema";
import {
  selectAuditLogs,
  selectIngestionRun,
  selectIngestionRuns,
  selectStudioDashboard,
  selectStudioUser,
  selectStudioUsers,
  restoreExpiredUserSuspensionsTransaction,
  updateStudioUserStatusTransaction,
  selectStudioOperators,
  updateStudioOperatorTransaction,
} from "./queries";

const SUSPENSION_RECOVERY_BATCH_SIZE = 500;

export async function restoreExpiredUserSuspensions(
  actor: Actor,
  now = new Date(),
) {
  if (actor.type !== "AGENT" || actor.role !== "ADMIN") {
    throw new AppError(
      ErrorCode.FORBIDDEN,
      "Automated suspension recovery requires an agent",
      403,
    );
  }
  const result = await restoreExpiredUserSuspensionsTransaction(
    actor,
    now,
    SUSPENSION_RECOVERY_BATCH_SIZE,
  );
  return expiredSuspensionRecoveryResponseSchema.parse({ data: result });
}

export async function listAuditLogs(actor: Actor, rawQuery: unknown = {}) {
  requireStudioPermission(actor, "studio.audit.read");
  const query = auditLogListQuerySchema.parse(rawQuery);
  const result = await selectAuditLogs(query);
  return auditLogListResponseSchema.parse({
    data: result.records.map((record) => ({
      ...record,
      createdAt: record.createdAt.toISOString(),
    })),
    meta: {
      nextCursor: result.nextCursor,
      targetTypes: result.targetTypes,
    },
  });
}

function runSummary(run: {
  id: string;
  provider: ExternalProvider;
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
  trigger: "MANUAL" | "SCHEDULED";
  fetched: number;
  selected: number;
  inserted: number;
  unchanged: number;
  totalAvailable: number | null;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}) {
  return {
    ...run,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    durationMs: run.finishedAt
      ? Math.max(0, run.finishedAt.getTime() - run.startedAt.getTime())
      : null,
  };
}

function userSummary(
  user: Awaited<ReturnType<typeof selectStudioUsers>>["records"][number],
) {
  const membership = user.coupleMemberships[0];
  const couple = membership?.couple;
  const partner = couple?.members.find((member) => member.user.id !== user.id);
  return {
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    status: user.status,
    providers: user.authIdentities.map((identity) => identity.provider),
    createdAt: user.createdAt.toISOString(),
    lastActiveAt: user.events[0]?.createdAt.toISOString() ?? null,
    courseCount: user._count.soloCourses + (couple?._count.courses ?? 0),
    scrapCount: user._count.scraps,
    couple: couple
      ? {
          id: couple.id,
          displayName: couple.displayName,
          partnerNickname: partner?.user.nickname ?? null,
        }
      : null,
  };
}

export async function listStudioUsers(actor: Actor, rawQuery: unknown = {}) {
  requireStudioPermission(actor, "studio.users.read");
  const query = studioUserListQuerySchema.parse(rawQuery);
  const result = await selectStudioUsers(query);
  return studioUserListResponseSchema.parse({
    data: result.records.map(userSummary),
    meta: { nextCursor: result.nextCursor },
  });
}

export async function getStudioUser(actor: Actor, id: string) {
  requireStudioPermission(actor, "studio.users.read");
  const user = await selectStudioUser(id);
  if (!user)
    throw new AppError(ErrorCode.USER_NOT_FOUND, "User not found", 404);
  const membership = user.coupleMemberships[0];
  const couple = membership?.couple;
  const courses = [
    ...user.soloCourses.map((course) => ({
      ...course,
      ownership: "SOLO" as const,
    })),
    ...(couple?.courses.map((course) => ({
      ...course,
      ownership: "COUPLE" as const,
    })) ?? []),
  ]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 20)
    .map((course) => ({
      ...course,
      createdAt: course.createdAt.toISOString(),
      publishedAt: course.publishedAt?.toISOString() ?? null,
    }));
  return studioUserDetailResponseSchema.parse({
    data: {
      ...userSummary({
        ...user,
        events: user.events.slice(0, 1),
        authIdentities: user.authIdentities,
      }),
      profileImageUrl: user.profileImageUrl,
      updatedAt: user.updatedAt.toISOString(),
      deletedAt: user.deletedAt?.toISOString() ?? null,
      statusReason: user.statusReason,
      suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
      statusChangedAt: user.statusChangedAt?.toISOString() ?? null,
      identities: user.authIdentities.map((identity) => ({
        provider: identity.provider,
        createdAt: identity.createdAt.toISOString(),
      })),
      currentCouple:
        couple && membership
          ? {
              id: couple.id,
              displayName: couple.displayName,
              status: couple.status,
              startedAt: couple.startedAt.toISOString(),
              joinedAt: membership.joinedAt.toISOString(),
              members: couple.members.map(({ user: member }) => member),
            }
          : null,
      courses,
      scraps: user.scraps.map((scrap) => ({
        ...scrap,
        createdAt: scrap.createdAt.toISOString(),
      })),
      recentActivity: user.events.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
    },
  });
}

export async function updateStudioUserStatus(
  actor: Actor,
  id: string,
  rawInput: unknown,
  now = new Date(),
) {
  requireStudioPermission(actor, "studio.users.manage");
  if (actor.id === id)
    throw new AppError(
      ErrorCode.FORBIDDEN,
      "Operators cannot change their own account status",
      403,
    );
  const input = studioUserStatusUpdateRequestSchema.parse(rawInput);
  if (input.status === "WITHDRAWN")
    requireStudioPermission(actor, "studio.users.withdraw");
  if (
    input.status === "SUSPENDED" &&
    input.suspendedUntil &&
    new Date(input.suspendedUntil) <= now
  )
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "Suspension end must be in the future",
      400,
    );
  const result = await updateStudioUserStatusTransaction(actor, id, input, now);
  if (result.outcome === "not-found")
    throw new AppError(ErrorCode.USER_NOT_FOUND, "User not found", 404);
  if (result.outcome === "conflict")
    throw new AppError(
      ErrorCode.USER_CONFLICT,
      "User was changed by another operator",
      409,
    );
  if (result.outcome === "withdrawn")
    throw new AppError(
      ErrorCode.USER_CONFLICT,
      "Withdrawn users cannot be restored from Studio",
      409,
    );
  if (result.outcome === "operator")
    throw new AppError(
      ErrorCode.FORBIDDEN,
      "Remove the Studio role before restricting this operator",
      403,
    );
  const record = result.record;
  return studioUserStatusUpdateResponseSchema.parse({
    data: {
      ...record,
      statusReason: record.statusReason,
      suspendedUntil: record.suspendedUntil?.toISOString() ?? null,
      statusChangedAt: record.statusChangedAt?.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    },
  });
}

export async function listStudioOperators(
  actor: Actor,
  rawQuery: unknown = {},
) {
  requireStudioPermission(actor, "studio.roles.manage");
  const query = studioOperatorListQuerySchema.parse(rawQuery);
  const result = await selectStudioOperators(query);
  return studioOperatorListResponseSchema.parse({
    data: result.records.map((record) => ({
      ...record,
      updatedAt: record.updatedAt.toISOString(),
    })),
    meta: { nextCursor: result.nextCursor },
  });
}

export async function updateStudioOperator(
  actor: Actor,
  id: string,
  rawInput: unknown,
) {
  requireStudioPermission(actor, "studio.roles.manage");
  if (actor.id === id)
    throw new AppError(
      ErrorCode.FORBIDDEN,
      "Operators cannot change their own role",
      403,
    );
  const input = studioOperatorUpdateRequestSchema.parse(rawInput);
  const result = await updateStudioOperatorTransaction(actor, id, input);
  if (result.outcome === "not-found")
    throw new AppError(ErrorCode.USER_NOT_FOUND, "User not found", 404);
  if (result.outcome === "conflict")
    throw new AppError(
      ErrorCode.USER_CONFLICT,
      "User was changed by another operator",
      409,
    );
  if (result.outcome === "inactive")
    throw new AppError(
      ErrorCode.USER_CONFLICT,
      "Only active users can be operators",
      409,
    );
  if (result.outcome === "last-super-admin")
    throw new AppError(
      ErrorCode.USER_CONFLICT,
      "The last super administrator cannot be removed",
      409,
    );
  return studioOperatorUpdateResponseSchema.parse({
    data: {
      ...result.record,
      updatedAt: result.record.updatedAt.toISOString(),
    },
  });
}

export async function loadStudioDashboard(actor: Actor, now = new Date()) {
  requireStudioPermission(actor, "studio.dashboard.read");
  const data = await selectStudioDashboard(now);
  return studioDashboardResponseSchema.parse({
    data: {
      metrics: data.metrics,
      providers: data.providerRuns.map(({ provider, run }) => ({
        provider,
        status: run?.status ?? null,
        inserted: run?.inserted ?? 0,
        errorMessage: run?.errorMessage ?? null,
        startedAt: run?.startedAt.toISOString() ?? null,
        finishedAt: run?.finishedAt?.toISOString() ?? null,
      })),
      recentRuns: data.recentRuns.map(runSummary),
    },
  });
}

export async function listIngestionRuns(actor: Actor, rawQuery: unknown = {}) {
  requireStudioPermission(actor, "studio.ingestions.read");
  const query = ingestionRunListQuerySchema.parse(rawQuery);
  const result = await selectIngestionRuns(query);
  return ingestionRunListResponseSchema.parse({
    data: result.records.map(runSummary),
    meta: { nextCursor: result.nextCursor },
  });
}

export async function getIngestionRun(actor: Actor, id: string) {
  requireStudioPermission(actor, "studio.ingestions.read");
  const run = await selectIngestionRun(id);
  if (!run)
    throw new AppError(
      ErrorCode.INGESTION_NOT_FOUND,
      "Ingestion run not found",
      404,
    );
  return ingestionRunDetailResponseSchema.parse({
    data: {
      ...runSummary(run),
      actorId: run.actorId,
      actorType: run.actorType,
      requestPayload: run.requestPayload,
      records: run.records.map((record) => {
        const event = normalizedCulturalEventSchema.safeParse(
          record.normalizedPayload,
        );
        return {
          id: record.id,
          externalId: record.externalId,
          status: record.status,
          title: event.success ? event.data.title : null,
          fetchedAt: record.fetchedAt.toISOString(),
        };
      }),
    },
  });
}
