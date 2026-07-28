import { describe, expect, it } from "vitest";
import { buildHomeFeed } from "./service";
import type { HomeFeedRecords } from "./queries";

const records: HomeFeedRecords = {
  happenings: [
    {
      id: "happening-1",
      status: "ACTIVE",
      startsAt: new Date("2026-07-18T00:00:00.000Z"),
      endsAt: new Date("2026-07-27T00:00:00.000Z"),
      translations: [{ title: "여름 팝업" }],
      place: { areaSlug: "seongsu", translations: [{ name: "성수 아카이브" }] },
    },
  ],
  courses: [
    {
      slug: "seongsu-date",
      durationMinutes: 260,
      couple: { displayName: "지훈♥민지", status: "ACTIVE" },
      creatorUser: null,
      nodes: [
        {
          place: {
            areaSlug: "seongsu",
            translations: [{ name: "성수 아카이브" }],
          },
        },
      ],
      tags: [{ tag: { labelKo: "비오는 날", labelEn: "Rainy day" } }],
      _count: { nodes: 3, scraps: 12 },
    },
  ],
};

describe("buildHomeFeed", () => {
  it("maps database records to the validated Korean view contract", () => {
    const feed = buildHomeFeed(
      records,
      "ko",
      new Date("2026-07-22T00:00:00.000Z"),
    );
    expect(feed.happenings[0]?.dDay).toBe("D-5");
    expect(feed.courses[0]).toMatchObject({
      coupleName: "지훈♥민지",
      duration: "4H 20M",
      stops: 3,
      scraps: 12,
      tags: ["비오는 날"],
    });
  });
});
