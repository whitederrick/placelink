import { getDatabase } from "@placelink/database";
import type {
  AuditLogListQuery,
  IngestionRunListQuery,
  StudioUserListQuery,
  StudioUserStatusUpdateRequest,
  StudioOperatorListQuery,
  StudioOperatorUpdateRequest,
} from "./schema";
import type { Actor } from "@/lib/auth/actor";

export async function selectAuditLogs(query: AuditLogListQuery) {
  const search = query.search || undefined;
  const database = getDatabase();
  const [records, targetTypes] = await Promise.all([
    database.auditLog.findMany({
      where: {
        actorType: query.actorType,
        targetType: query.targetType,
        OR: search
          ? [
              { action: { contains: search, mode: "insensitive" } },
              { actorId: { contains: search, mode: "insensitive" } },
              { targetId: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      cursor: query.cursor ? { id: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0,
      take: query.take + 1,
    }),
    database.auditLog.findMany({
      distinct: ["targetType"],
      orderBy: { targetType: "asc" },
      select: { targetType: true },
    }),
  ]);
  const hasNext = records.length > query.take;
  const page = hasNext ? records.slice(0, query.take) : records;
  return {
    records: page,
    nextCursor: hasNext ? page.at(-1)?.id : undefined,
    targetTypes: targetTypes.map((record) => record.targetType),
  };
}

const userCoupleSelect = {
  id: true,
  displayName: true,
  status: true,
  startedAt: true,
  members: {
    where: { leftAt: null },
    select: { user: { select: { id: true, nickname: true } } },
  },
  _count: { select: { courses: true } },
} as const;

const studioUserSummarySelect = {
  id: true,
  nickname: true,
  email: true,
  status: true,
  createdAt: true,
  authIdentities: { select: { provider: true } },
  events: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { createdAt: true },
  },
  coupleMemberships: {
    where: { leftAt: null, couple: { status: "ACTIVE" as const } },
    take: 1,
    select: { couple: { select: userCoupleSelect } },
  },
  _count: { select: { soloCourses: true, scraps: true } },
} as const;

export async function selectStudioUsers(query: StudioUserListQuery) {
  const search = query.search || undefined;
  const records = await getDatabase().user.findMany({
    where: {
      status: query.status,
      authIdentities: query.provider
        ? { some: { provider: query.provider } }
        : undefined,
      OR: search
        ? [
            { id: { contains: search, mode: "insensitive" } },
            { nickname: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0,
    take: query.take + 1,
    select: studioUserSummarySelect,
  });
  const hasNext = records.length > query.take;
  const page = hasNext ? records.slice(0, query.take) : records;
  return {
    records: page,
    nextCursor: hasNext ? page.at(-1)?.id : undefined,
  };
}

export async function selectStudioOperators(query: StudioOperatorListQuery) {
  const search = query.search || undefined;
  const records = await getDatabase().user.findMany({
    where: {
      status: { not: "WITHDRAWN" },
      OR: search
        ? [
            { id: { contains: search, mode: "insensitive" } },
            { nickname: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ]
        : [{ studioRole: { not: null } }],
    },
    orderBy: [{ studioRole: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0,
    take: query.take + 1,
    select: {
      id: true,
      nickname: true,
      email: true,
      status: true,
      studioRole: true,
      updatedAt: true,
    },
  });
  const hasNext = records.length > query.take;
  const page = hasNext ? records.slice(0, query.take) : records;
  return { records: page, nextCursor: hasNext ? page.at(-1)?.id : undefined };
}

export async function updateStudioOperatorTransaction(
  actor: Actor,
  id: string,
  input: StudioOperatorUpdateRequest,
) {
  return getDatabase().$transaction(async (transaction) => {
    const before = await transaction.user.findUnique({
      where: { id },
      select: { id: true, status: true, studioRole: true, updatedAt: true },
    });
    if (!before) return { outcome: "not-found" as const };
    if (before.status !== "ACTIVE") return { outcome: "inactive" as const };
    if (
      before.studioRole === "SUPER_ADMIN" &&
      input.studioRole !== "SUPER_ADMIN"
    ) {
      const superAdmins = await transaction.user.count({
        where: { studioRole: "SUPER_ADMIN", status: "ACTIVE" },
      });
      if (superAdmins <= 1) return { outcome: "last-super-admin" as const };
    }
    const result = await transaction.user.updateMany({
      where: { id, updatedAt: new Date(input.expectedUpdatedAt) },
      data: { studioRole: input.studioRole },
    });
    if (result.count !== 1) return { outcome: "conflict" as const };
    const after = await transaction.user.findUniqueOrThrow({
      where: { id },
      select: { id: true, studioRole: true, updatedAt: true },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        actorType: actor.type,
        action: "studio_operator.role_updated",
        targetType: "User",
        targetId: id,
        before: { studioRole: before.studioRole },
        after: { studioRole: after.studioRole, reason: input.reason },
      },
    });
    return { outcome: "updated" as const, record: after };
  });
}

export async function selectStudioUser(id: string) {
  return getDatabase().user.findUnique({
    where: { id },
    select: {
      ...studioUserSummarySelect,
      profileImageUrl: true,
      updatedAt: true,
      deletedAt: true,
      statusReason: true,
      suspendedUntil: true,
      statusChangedAt: true,
      authIdentities: {
        orderBy: { createdAt: "asc" },
        select: { provider: true, createdAt: true },
      },
      events: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 20,
        select: { id: true, name: true, createdAt: true },
      },
      coupleMemberships: {
        where: { leftAt: null, couple: { status: "ACTIVE" } },
        take: 1,
        select: {
          joinedAt: true,
          couple: {
            select: {
              ...userCoupleSelect,
              courses: {
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                take: 20,
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  status: true,
                  createdAt: true,
                  publishedAt: true,
                },
              },
            },
          },
        },
      },
      soloCourses: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 20,
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          createdAt: true,
          publishedAt: true,
        },
      },
      scraps: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 20,
        select: {
          id: true,
          createdAt: true,
          course: { select: { slug: true, title: true, status: true } },
        },
      },
    },
  });
}

export async function updateStudioUserStatusTransaction(
  actor: Actor,
  id: string,
  input: StudioUserStatusUpdateRequest,
  now: Date,
) {
  return getDatabase().$transaction(async (transaction) => {
    const before = await transaction.user.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        statusReason: true,
        suspendedUntil: true,
        updatedAt: true,
        deletedAt: true,
        studioRole: true,
      },
    });
    if (!before) return { outcome: "not-found" as const };
    if (before.status === "WITHDRAWN") return { outcome: "withdrawn" as const };
    if (before.studioRole && input.status !== "ACTIVE")
      return { outcome: "operator" as const };
    const result = await transaction.user.updateMany({
      where: { id, updatedAt: new Date(input.expectedUpdatedAt) },
      data: {
        status: input.status,
        statusReason: input.reason,
        suspendedUntil:
          input.status === "SUSPENDED" && input.suspendedUntil
            ? new Date(input.suspendedUntil)
            : null,
        statusChangedAt: now,
        deletedAt: input.status === "WITHDRAWN" ? now : null,
      },
    });
    if (result.count !== 1) return { outcome: "conflict" as const };
    const after = await transaction.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        status: true,
        statusReason: true,
        suspendedUntil: true,
        statusChangedAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        actorType: actor.type,
        action: `user.status.${input.status.toLowerCase()}`,
        targetType: "User",
        targetId: id,
        before: {
          status: before.status,
          statusReason: before.statusReason,
          suspendedUntil: before.suspendedUntil?.toISOString() ?? null,
          deletedAt: before.deletedAt?.toISOString() ?? null,
        },
        after: {
          status: after.status,
          reason: input.reason,
          suspendedUntil: after.suspendedUntil?.toISOString() ?? null,
          deletedAt: after.deletedAt?.toISOString() ?? null,
        },
      },
    });
    return { outcome: "updated" as const, record: after };
  });
}

const runSelect = {
  id: true,
  provider: true,
  status: true,
  trigger: true,
  fetched: true,
  selected: true,
  inserted: true,
  unchanged: true,
  totalAvailable: true,
  errorMessage: true,
  startedAt: true,
  finishedAt: true,
} as const;

export async function selectStudioDashboard(now: Date) {
  const database = getDatabase();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1_000);
  const [
    activeUsers,
    newUsers7d,
    recentActivity15m,
    publishedCourses,
    liveHappenings,
    pendingIngestions,
    failedRuns24h,
    seoulRun,
    culturePortalRun,
    recentRuns,
  ] = await Promise.all([
    database.user.count({ where: { status: "ACTIVE" } }),
    database.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    database.analyticsEvent.count({
      where: { createdAt: { gte: fifteenMinutesAgo } },
    }),
    database.course.count({ where: { status: "PUBLISHED" } }),
    database.happening.count({
      where: {
        status: { in: ["UPCOMING", "ACTIVE"] },
        endsAt: { gt: now },
      },
    }),
    database.ingestionRecord.count({ where: { status: "NORMALIZED" } }),
    database.ingestionRun.count({
      where: { status: "FAILED", startedAt: { gte: oneDayAgo } },
    }),
    database.ingestionRun.findFirst({
      where: { provider: "SEOUL_OPEN_DATA" },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      select: runSelect,
    }),
    database.ingestionRun.findFirst({
      where: { provider: "CULTURE_PORTAL" },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      select: runSelect,
    }),
    database.ingestionRun.findMany({
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      take: 5,
      select: runSelect,
    }),
  ]);
  return {
    metrics: {
      activeUsers,
      newUsers7d,
      recentActivity15m,
      publishedCourses,
      liveHappenings,
      pendingIngestions,
      failedRuns24h,
    },
    providerRuns: [
      { provider: "SEOUL_OPEN_DATA" as const, run: seoulRun },
      { provider: "CULTURE_PORTAL" as const, run: culturePortalRun },
    ],
    recentRuns,
  };
}

export async function selectIngestionRuns(query: IngestionRunListQuery) {
  const records = await getDatabase().ingestionRun.findMany({
    where: { provider: query.provider, status: query.status },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0,
    take: query.take + 1,
    select: runSelect,
  });
  const hasNext = records.length > query.take;
  const page = hasNext ? records.slice(0, query.take) : records;
  return {
    records: page,
    nextCursor: hasNext ? page.at(-1)?.id : undefined,
  };
}

export async function selectIngestionRun(id: string) {
  return getDatabase().ingestionRun.findUnique({
    where: { id },
    select: {
      ...runSelect,
      actorId: true,
      actorType: true,
      requestPayload: true,
      records: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
        select: {
          id: true,
          externalId: true,
          status: true,
          normalizedPayload: true,
          fetchedAt: true,
        },
      },
    },
  });
}
