import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  selectCourseAnchorRecords: vi.fn(),
  selectCourseAnchorById: vi.fn(),
  selectCourseOwner: vi.fn(),
  countRecentDrafts: vi.fn(),
  insertCourseDraft: vi.fn(),
  selectDraftCourse: vi.fn(),
  selectRoutePlaces: vi.fn(),
  replaceDraftNodes: vi.fn(),
  publishDraftCourse: vi.fn(),
  selectPublishedCourse: vi.fn(),
}));

vi.mock("./queries", () => queryMocks);

import {
  createCourseDraft,
  publishCourseDraft,
  updateCourseDraft,
} from "./service";

const anchor = {
  id: "happening-1",
  status: "ACTIVE" as const,
  startsAt: new Date("2026-07-18T00:00:00.000Z"),
  endsAt: new Date("2026-07-31T00:00:00.000Z"),
  translations: [{ title: "성수 여름 팝업" }],
  place: {
    id: "place-1",
    areaSlug: "seongsu",
    lat: 37.5446,
    lng: 127.0559,
    translations: [{ name: "성수 팝업", address: "서울 성수" }],
  },
};

describe("createCourseDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMocks.selectCourseOwner.mockResolvedValue({
      id: "user-1",
      status: "ACTIVE",
      coupleMemberships: [{ coupleId: "couple-1" }],
    });
    queryMocks.selectCourseAnchorById.mockResolvedValue(anchor);
    queryMocks.countRecentDrafts.mockResolvedValue(0);
    queryMocks.insertCourseDraft.mockResolvedValue({
      id: "course-1",
      slug: "course-slug",
      status: "DRAFT",
      title: "성수 여름 팝업 데이트",
    });
  });

  it("creates the first course node under the active couple owner", async () => {
    const result = await createCourseDraft(
      { id: "user-1", type: "HUMAN", role: "USER" },
      { locale: "ko", anchorHappeningId: "happening-1" },
      new Date("2026-07-22T00:00:00.000Z"),
    );
    expect(queryMocks.countRecentDrafts).toHaveBeenCalledWith(
      { coupleId: "couple-1" },
      expect.any(Date),
    );
    expect(queryMocks.insertCourseDraft).toHaveBeenCalledWith(
      { coupleId: "couple-1" },
      anchor,
      expect.any(Object),
      expect.stringMatching(/^course-/),
    );
    expect(result.data.status).toBe("DRAFT");
    expect(result.data.anchor.happeningId).toBe("happening-1");
  });
});

describe("updateCourseDraft", () => {
  const actor = { id: "user-1", type: "HUMAN" as const, role: "USER" as const };
  const draftRecord = {
    id: "course-1",
    slug: "course-slug",
    status: "DRAFT" as const,
    title: "성수 여름 팝업 데이트",
    dayCount: 1,
    dayStartMinutes: 600,
    dayEndMinutes: 1320,
    targetStopCount: 3,
    creatorUserId: null,
    creatorUser: null,
    couple: {
      displayName: "지훈❤️민지",
      status: "ACTIVE" as const,
      members: [{ userId: "user-1" }],
    },
    nodes: [
      {
        id: "node-1",
        orderIndex: 0,
        dayIndex: 1,
        durationMinutes: 60,
        tip: null,
        distanceMeters: null,
        place: {
          ...anchor.place,
          category: "EXHIBITION",
          status: "ACTIVE" as const,
        },
      },
    ],
  };

  beforeEach(() => vi.clearAllMocks());

  it("recalculates route distance and persists all nodes atomically", async () => {
    const secondPlace = {
      id: "place-2",
      areaSlug: "seongsu",
      category: "CAFE",
      lat: 37.546,
      lng: 127.057,
      translations: [{ name: "성수 카페", address: "서울 성수" }],
    };
    queryMocks.selectDraftCourse
      .mockResolvedValueOnce(draftRecord)
      .mockResolvedValueOnce({
        ...draftRecord,
        nodes: [
          draftRecord.nodes[0],
          {
            id: "node-2",
            orderIndex: 1,
            dayIndex: 1,
            durationMinutes: 60,
            tip: "창가 자리",
            distanceMeters: 190,
            place: { ...secondPlace, status: "ACTIVE" },
          },
        ],
      });
    queryMocks.selectRoutePlaces.mockResolvedValue([
      { ...anchor.place, category: "EXHIBITION" },
      secondPlace,
    ]);
    queryMocks.replaceDraftNodes.mockResolvedValue(undefined);
    const result = await updateCourseDraft(actor, "course-slug", "ko", {
      dayCount: 1,
      dayStartMinutes: 600,
      dayEndMinutes: 1320,
      targetStopCount: 3,
      nodes: [
        { placeId: "place-1", dayIndex: 1, durationMinutes: 60 },
        {
          placeId: "place-2",
          dayIndex: 1,
          durationMinutes: 60,
          tip: "창가 자리",
        },
      ],
    });
    expect(queryMocks.replaceDraftNodes).toHaveBeenCalledWith(
      "course-1",
      expect.objectContaining({
        dayCount: 1,
        targetStopCount: 3,
      }),
      expect.arrayContaining([
        expect.objectContaining({
          placeId: "place-2",
          distanceMeters: expect.any(Number),
        }),
      ]),
    );
    expect(result.data.nodes).toHaveLength(2);
    expect(result.data.nodes[1]?.walkMinutes).toBe(3);
  });

  it("rejects moving the anchor away from the first stop", async () => {
    queryMocks.selectDraftCourse.mockResolvedValue(draftRecord);
    await expect(
      updateCourseDraft(actor, "course-slug", "ko", {
        dayCount: 1,
        dayStartMinutes: 600,
        dayEndMinutes: 1320,
        targetStopCount: 3,
        nodes: [
          { placeId: "place-2", dayIndex: 1, durationMinutes: 60 },
          { placeId: "place-1", dayIndex: 1, durationMinutes: 60 },
        ],
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(queryMocks.replaceDraftNodes).not.toHaveBeenCalled();
  });
});

describe("publishCourseDraft", () => {
  const actor = { id: "user-1", type: "HUMAN" as const, role: "USER" as const };
  const publishableDraft = {
    id: "course-1",
    slug: "course-slug",
    status: "DRAFT" as const,
    title: "기존 제목",
    dayCount: 1,
    dayStartMinutes: 600,
    dayEndMinutes: 1320,
    targetStopCount: 3,
    creatorUserId: null,
    creatorUser: null,
    couple: {
      displayName: "지훈❤️민지",
      status: "ACTIVE" as const,
      members: [{ userId: "user-1" }],
    },
    nodes: [
      {
        id: "node-1",
        orderIndex: 0,
        dayIndex: 1,
        durationMinutes: 60,
        tip: null,
        distanceMeters: null,
        place: {
          ...anchor.place,
          category: "EXHIBITION",
          status: "ACTIVE" as const,
        },
      },
      {
        id: "node-2",
        orderIndex: 1,
        dayIndex: 1,
        durationMinutes: 60,
        tip: "창가 자리",
        distanceMeters: 190,
        place: {
          ...anchor.place,
          id: "place-2",
          category: "CAFE",
          status: "ACTIVE" as const,
        },
      },
    ],
  };

  beforeEach(() => vi.clearAllMocks());

  it("publishes an owned route and derives its duration", async () => {
    queryMocks.selectDraftCourse.mockResolvedValue(publishableDraft);
    queryMocks.publishDraftCourse.mockResolvedValue({
      slug: "course-slug",
      status: "PUBLISHED",
      publishedAt: new Date("2026-07-22T10:00:00.000Z"),
    });
    const result = await publishCourseDraft(
      actor,
      "course-slug",
      "ko",
      { title: "지훈❤️민지 코스", description: "성수의 오후" },
      new Date("2026-07-22T10:00:00.000Z"),
    );
    expect(queryMocks.publishDraftCourse).toHaveBeenCalledWith(
      "course-1",
      expect.objectContaining({
        title: "지훈❤️민지 코스",
        durationMinutes: 123,
      }),
      expect.any(Date),
    );
    expect(result.data.status).toBe("PUBLISHED");
  });

  it("rejects a draft with fewer than two stops", async () => {
    queryMocks.selectDraftCourse.mockResolvedValue({
      ...publishableDraft,
      nodes: publishableDraft.nodes.slice(0, 1),
    });
    await expect(
      publishCourseDraft(actor, "course-slug", "ko", {
        title: "지훈❤️민지 코스",
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(queryMocks.publishDraftCourse).not.toHaveBeenCalled();
  });
});
