import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  selectStudioDashboard: vi.fn(),
  selectIngestionRuns: vi.fn(),
  selectIngestionRun: vi.fn(),
}));
vi.mock("./queries", () => queryMocks);

import {
  getIngestionRun,
  listIngestionRuns,
  loadStudioDashboard,
} from "./service";

const admin = { id: "admin-1", type: "HUMAN" as const, role: "ADMIN" as const };
const user = { id: "user-1", type: "HUMAN" as const, role: "USER" as const };
const run = {
  id: "run-1",
  provider: "CULTURE_PORTAL" as const,
  status: "SUCCEEDED" as const,
  trigger: "SCHEDULED" as const,
  fetched: 100,
  selected: 100,
  inserted: 80,
  unchanged: 20,
  totalAvailable: 250,
  errorMessage: null,
  startedAt: new Date("2026-08-27T10:00:00.000Z"),
  finishedAt: new Date("2026-08-27T10:00:05.000Z"),
};

describe("studio operations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-admin access", async () => {
    await expect(loadStudioDashboard(user)).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });

  it("builds the dashboard from operational metrics and provider health", async () => {
    queryMocks.selectStudioDashboard.mockResolvedValue({
      metrics: {
        activeUsers: 12,
        newUsers7d: 3,
        recentActivity15m: 4,
        publishedCourses: 5,
        liveHappenings: 20,
        pendingIngestions: 80,
        failedRuns24h: 0,
      },
      providerRuns: [
        { provider: "SEOUL_OPEN_DATA", run: null },
        { provider: "CULTURE_PORTAL", run },
      ],
      recentRuns: [run],
    });

    await expect(loadStudioDashboard(admin)).resolves.toMatchObject({
      data: {
        metrics: { activeUsers: 12, pendingIngestions: 80 },
        providers: [
          { provider: "SEOUL_OPEN_DATA", status: null },
          { provider: "CULTURE_PORTAL", status: "SUCCEEDED", inserted: 80 },
        ],
        recentRuns: [{ id: "run-1", durationMs: 5_000 }],
      },
    });
  });

  it("returns cursor-paginated run summaries", async () => {
    queryMocks.selectIngestionRuns.mockResolvedValue({
      records: [run],
      nextCursor: "run-next",
    });
    await expect(
      listIngestionRuns(admin, { provider: "CULTURE_PORTAL" }),
    ).resolves.toMatchObject({
      data: [{ id: "run-1", provider: "CULTURE_PORTAL" }],
      meta: { nextCursor: "run-next" },
    });
  });

  it("returns run detail with normalized record titles", async () => {
    queryMocks.selectIngestionRun.mockResolvedValue({
      ...run,
      actorId: "schedule-ingestion-cron",
      actorType: "AGENT",
      requestPayload: { start: 1, end: 100 },
      records: [
        {
          id: "record-1",
          externalId: "394040",
          status: "NORMALIZED",
          normalizedPayload: {
            provider: "CULTURE_PORTAL",
            externalId: "394040",
            title: "다시 보는 제헌절",
            categoryLabel: "전시",
            happeningKind: "EXHIBITION",
            placeName: "대한민국역사박물관",
            placeKind: "CULTURAL_VENUE",
        operatorType: "UNKNOWN",
            district: "서울",
            startsAt: "2026-07-15T15:00:00.000Z",
            endsAt: "2026-10-12T15:00:00.000Z",
            scheduleText: null,
            latitude: 37.5738,
            longitude: 126.9789,
            officialUrl: "https://www.culture.go.kr/event/394040",
            bookingUrl: null,
            imageUrl: null,
            organizer: null,
            audience: null,
            feeText: null,
            isFree: null,
            inquiry: null,
          },
          fetchedAt: new Date("2026-08-27T10:00:00.000Z"),
        },
      ],
    });

    await expect(getIngestionRun(admin, "run-1")).resolves.toMatchObject({
      data: {
        id: "run-1",
        actorType: "AGENT",
        records: [{ title: "다시 보는 제헌절" }],
      },
    });
  });
});
