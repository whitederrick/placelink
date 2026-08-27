import { getDatabase } from "@placelink/database";
import type { IngestionRunListQuery } from "./schema";

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
