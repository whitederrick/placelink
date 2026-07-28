import { getDatabase } from "@placelink/database";

export async function selectAnalyticsSummaryRecords(
  startedAt: Date,
  previousStartedAt: Date,
  endedAt: Date,
) {
  const database = getDatabase();
  const currentWindow = { gte: startedAt, lte: endedAt };
  const previousWindow = { gte: previousStartedAt, lt: startedAt };

  const [
    currentTotal,
    previousTotal,
    authenticatedTotal,
    eventGroups,
    latest,
    latestEvent,
    latestFilterEvent,
  ] = await Promise.all([
    database.analyticsEvent.count({ where: { createdAt: currentWindow } }),
    database.analyticsEvent.count({ where: { createdAt: previousWindow } }),
    database.analyticsEvent.count({
      where: { createdAt: currentWindow, userId: { not: null } },
    }),
    database.analyticsEvent.groupBy({
      by: ["name"],
      where: { createdAt: currentWindow },
      _count: { name: true },
      orderBy: { _count: { name: "desc" } },
      take: 20,
    }),
    database.analyticsEvent.findMany({
      where: { createdAt: currentWindow },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      select: { id: true, name: true, createdAt: true, userId: true },
    }),
    database.analyticsEvent.findFirst({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { createdAt: true },
    }),
    database.analyticsEvent.findFirst({
      where: { name: "filter.used" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { createdAt: true },
    }),
  ]);

  return {
    currentTotal,
    previousTotal,
    authenticatedTotal,
    eventGroups,
    latest,
    latestEvent,
    latestFilterEvent,
  };
}
