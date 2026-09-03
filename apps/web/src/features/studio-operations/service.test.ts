import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  selectAuditLogs: vi.fn(),
  selectStudioDashboard: vi.fn(),
  selectIngestionRuns: vi.fn(),
  selectIngestionRun: vi.fn(),
  selectStudioUsers: vi.fn(),
  selectStudioUser: vi.fn(),
  updateStudioUserStatusTransaction: vi.fn(),
}));
vi.mock("./queries", () => queryMocks);

import {
  getIngestionRun,
  getStudioUser,
  listIngestionRuns,
  listAuditLogs,
  listStudioUsers,
  loadStudioDashboard,
  updateStudioUserStatus,
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
const studioUser = {
  id: "user-1",
  nickname: "민지",
  email: "minji@example.test",
  status: "ACTIVE" as const,
  profileImageUrl: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-27T00:00:00.000Z"),
  deletedAt: null,
  statusReason: null,
  suspendedUntil: null,
  statusChangedAt: null,
  authIdentities: [
    {
      provider: "KAKAO" as const,
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
    },
  ],
  events: [
    {
      id: "event-1",
      name: "course_scrapped",
      createdAt: new Date("2026-08-27T10:00:00.000Z"),
    },
  ],
  coupleMemberships: [
    {
      joinedAt: new Date("2026-08-02T00:00:00.000Z"),
      couple: {
        id: "couple-1",
        displayName: "지훈♥민지",
        status: "ACTIVE" as const,
        startedAt: new Date("2025-03-23T00:00:00.000Z"),
        members: [
          { user: { id: "user-1", nickname: "민지" } },
          { user: { id: "user-2", nickname: "지훈" } },
        ],
        _count: { courses: 1 },
        courses: [
          {
            id: "course-1",
            slug: "couple-course",
            title: "성수 데이트",
            status: "PUBLISHED" as const,
            createdAt: new Date("2026-08-20T00:00:00.000Z"),
            publishedAt: new Date("2026-08-20T01:00:00.000Z"),
          },
        ],
      },
    },
  ],
  _count: { soloCourses: 1, scraps: 1 },
  soloCourses: [
    {
      id: "course-2",
      slug: "solo-course",
      title: "혼자 만든 코스",
      status: "DRAFT" as const,
      createdAt: new Date("2026-08-21T00:00:00.000Z"),
      publishedAt: null,
    },
  ],
  scraps: [
    {
      id: "scrap-1",
      createdAt: new Date("2026-08-22T00:00:00.000Z"),
      course: {
        slug: "saved-course",
        title: "저장한 코스",
        status: "PUBLISHED" as const,
      },
    },
  ],
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

  it("returns filtered user summaries without raw activity properties", async () => {
    queryMocks.selectStudioUsers.mockResolvedValue({
      records: [studioUser],
      nextCursor: "user-next",
    });

    await expect(
      listStudioUsers(admin, { search: "민지", provider: "KAKAO" }),
    ).resolves.toMatchObject({
      data: [
        {
          id: "user-1",
          providers: ["KAKAO"],
          lastActiveAt: "2026-08-27T10:00:00.000Z",
          couple: { partnerNickname: "지훈" },
        },
      ],
      meta: { nextCursor: "user-next" },
    });
  });

  it("returns user detail with solo and couple histories", async () => {
    queryMocks.selectStudioUser.mockResolvedValue(studioUser);

    await expect(getStudioUser(admin, "user-1")).resolves.toMatchObject({
      data: {
        id: "user-1",
        currentCouple: { displayName: "지훈♥민지" },
        courses: [
          { id: "course-2", ownership: "SOLO" },
          { id: "course-1", ownership: "COUPLE" },
        ],
        scraps: [{ id: "scrap-1" }],
        recentActivity: [{ name: "course_scrapped" }],
      },
    });
  });

  it("rejects non-admin user lookup", async () => {
    await expect(listStudioUsers(user)).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });

  it("updates a user status with optimistic concurrency metadata", async () => {
    queryMocks.updateStudioUserStatusTransaction.mockResolvedValue({
      outcome: "updated",
      record: {
        id: "user-1",
        status: "SUSPENDED",
        statusReason: "반복적인 서비스 악용",
        suspendedUntil: new Date("2026-09-10T00:00:00.000Z"),
        statusChangedAt: new Date("2026-09-03T12:00:00.000Z"),
        updatedAt: new Date("2026-09-03T12:00:00.000Z"),
        deletedAt: null,
      },
    });

    await expect(
      updateStudioUserStatus(
        admin,
        "user-1",
        {
          status: "SUSPENDED",
          reason: "반복적인 서비스 악용",
          suspendedUntil: "2026-09-10T00:00:00.000Z",
          expectedUpdatedAt: "2026-08-27T00:00:00.000Z",
        },
        new Date("2026-09-03T12:00:00.000Z"),
      ),
    ).resolves.toMatchObject({
      data: {
        status: "SUSPENDED",
        suspendedUntil: "2026-09-10T00:00:00.000Z",
      },
    });
  });

  it("prevents operators from changing their own status", async () => {
    await expect(
      updateStudioUserStatus(admin, "admin-1", {
        status: "SUSPENDED",
        reason: "self change",
        suspendedUntil: null,
        expectedUpdatedAt: "2026-08-27T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("reserves irreversible withdrawal for super administrators", async () => {
    const support = {
      id: "support-1",
      type: "HUMAN" as const,
      role: "ADMIN" as const,
      studioRole: "SUPPORT" as const,
    };
    await expect(
      updateStudioUserStatus(support, "user-1", {
        status: "WITHDRAWN",
        reason: "verified privacy request",
        expectedUpdatedAt: "2026-08-27T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("returns filtered audit logs with stored snapshots", async () => {
    queryMocks.selectAuditLogs.mockResolvedValue({
      records: [
        {
          id: "audit-1",
          actorId: "admin-1",
          actorType: "HUMAN",
          action: "support_case.updated",
          targetType: "SupportCase",
          targetId: "case-1",
          before: { status: "OPEN" },
          after: { status: "IN_PROGRESS" },
          createdAt: new Date("2026-09-03T10:00:00.000Z"),
        },
      ],
      nextCursor: "audit-next",
      targetTypes: ["SupportCase"],
    });

    await expect(
      listAuditLogs(admin, { actorType: "HUMAN", targetType: "SupportCase" }),
    ).resolves.toEqual({
      data: [
        expect.objectContaining({
          id: "audit-1",
          before: { status: "OPEN" },
          createdAt: "2026-09-03T10:00:00.000Z",
        }),
      ],
      meta: { nextCursor: "audit-next", targetTypes: ["SupportCase"] },
    });
  });
});
