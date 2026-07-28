import { getDatabase } from "@placelink/database";
import {
  analyticsSummarySchema,
  type AnalyticsEventRequest,
  type AnalyticsSummary,
} from "./schema";
import { selectAnalyticsSummaryRecords } from "./queries";

const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;

export async function recordAnalyticsEvent(
  event: AnalyticsEventRequest,
  userId?: string,
) {
  const database = getDatabase();
  let properties: Record<string, string | number | undefined> = {
    ...event.properties,
  };

  if ("courseSlug" in event.properties) {
    const course = await database.course.findUnique({
      where: { slug: event.properties.courseSlug },
      select: { id: true, status: true, deletedAt: true },
    });
    if (!course || course.status !== "PUBLISHED" || course.deletedAt) return;
    properties = { ...properties, courseId: course.id };

    if (event.name === "course.viewed") {
      await database.$transaction([
        database.course.update({
          where: { id: course.id },
          data: { viewCount: { increment: 1 } },
        }),
        database.analyticsEvent.create({
          data: { name: event.name, userId, properties },
        }),
      ]);
      return;
    }
  }

  await database.analyticsEvent.create({
    data: { name: event.name, userId, properties },
  });
}

export function buildAnalyticsSummary(
  records: Awaited<ReturnType<typeof selectAnalyticsSummaryRecords>>,
  days: number,
  now: Date,
): AnalyticsSummary {
  const startedAt = new Date(now.getTime() - days * DAY_MILLISECONDS);
  const filterCount =
    records.eventGroups.find((group) => group.name === "filter.used")?._count
      .name ?? 0;
  const lastEventAt = records.latestEvent?.createdAt ?? null;
  const monitoringStatus =
    !lastEventAt || records.currentTotal === 0
      ? "idle"
      : now.getTime() - lastEventAt.getTime() > DAY_MILLISECONDS
        ? "stale"
        : "healthy";
  const changePercent =
    records.previousTotal === 0
      ? records.currentTotal === 0
        ? 0
        : null
      : Math.round(
          ((records.currentTotal - records.previousTotal) /
            records.previousTotal) *
            1_000,
        ) / 10;

  return analyticsSummarySchema.parse({
    range: {
      days,
      startedAt: startedAt.toISOString(),
      endedAt: now.toISOString(),
    },
    totals: {
      current: records.currentTotal,
      previous: records.previousTotal,
      authenticated: records.authenticatedTotal,
      changePercent,
    },
    events: records.eventGroups.map((group) => ({
      name: group.name,
      count: group._count.name,
    })),
    filters: {
      count: filterCount,
      lastUsedAt: records.latestFilterEvent?.createdAt.toISOString() ?? null,
    },
    monitoring: {
      status: monitoringStatus,
      lastEventAt: lastEventAt?.toISOString() ?? null,
    },
    latest: records.latest.map((event) => ({
      id: event.id,
      name: event.name,
      createdAt: event.createdAt.toISOString(),
      authenticated: event.userId !== null,
    })),
  });
}

export async function loadAnalyticsSummary(
  days = 7,
  now = new Date(),
): Promise<AnalyticsSummary> {
  const startedAt = new Date(now.getTime() - days * DAY_MILLISECONDS);
  const previousStartedAt = new Date(
    startedAt.getTime() - days * DAY_MILLISECONDS,
  );
  const records = await selectAnalyticsSummaryRecords(
    startedAt,
    previousStartedAt,
    now,
  );
  return buildAnalyticsSummary(records, days, now);
}
