import { describe, expect, it } from "vitest";
import { buildAnalyticsSummary } from "./service";

describe("buildAnalyticsSummary", () => {
  it("summarizes event usage and marks recent collection healthy", () => {
    const now = new Date("2026-07-29T12:00:00.000Z");
    const summary = buildAnalyticsSummary(
      {
        currentTotal: 12,
        previousTotal: 8,
        authenticatedTotal: 5,
        eventGroups: [
          { name: "filter.used", _count: { name: 7 } },
          { name: "course.viewed", _count: { name: 5 } },
        ],
        latest: [
          {
            id: "event-1",
            name: "filter.used",
            createdAt: new Date("2026-07-29T11:00:00.000Z"),
            userId: null,
          },
        ],
        latestEvent: {
          createdAt: new Date("2026-07-29T11:00:00.000Z"),
        },
        latestFilterEvent: {
          createdAt: new Date("2026-07-29T11:00:00.000Z"),
        },
      },
      7,
      now,
    );

    expect(summary.totals.changePercent).toBe(50);
    expect(summary.filters.count).toBe(7);
    expect(summary.monitoring.status).toBe("healthy");
  });

  it("marks collection stale when the last event is older than a day", () => {
    const now = new Date("2026-07-29T12:00:00.000Z");
    const summary = buildAnalyticsSummary(
      {
        currentTotal: 1,
        previousTotal: 0,
        authenticatedTotal: 0,
        eventGroups: [],
        latest: [],
        latestEvent: {
          createdAt: new Date("2026-07-27T11:00:00.000Z"),
        },
        latestFilterEvent: null,
      },
      7,
      now,
    );

    expect(summary.totals.changePercent).toBeNull();
    expect(summary.monitoring.status).toBe("stale");
  });
});
