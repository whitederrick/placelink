import { describe, expect, it } from "vitest";
import { buildHomeFeed, getSeoulDayPeriod, loadHomeHero } from "./service";
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
      id: "course-seongsu-date",
      slug: "seongsu-date",
      durationMinutes: 260,
      viewCount: 24,
      scrapCount: 12,
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
  hallCandidates: [],
  filterTags: [],
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

  it("ranks eligible popular courses with a stable score", () => {
    const feed = buildHomeFeed(
      {
        ...records,
        hallCandidates: [{ ...records.courses[0]!, weeklyScraps: 4 }],
      },
      "en",
      new Date("2026-07-22T00:00:00.000Z"),
    );
    expect(feed.hallOfFame[0]).toMatchObject({
      slug: "seongsu-date",
      rank: 1,
      weeklyScraps: 4,
      score: 20,
    });
  });
});

describe("getSeoulDayPeriod", () => {
  it.each([
    ["2026-08-25T21:30:00.000Z", "morning"],
    ["2026-08-26T03:00:00.000Z", "afternoon"],
    ["2026-08-26T10:00:00.000Z", "evening"],
    ["2026-08-26T15:00:00.000Z", "night"],
  ] as const)("maps %s to the Seoul %s period", (value, expected) => {
    expect(getSeoulDayPeriod(new Date(value))).toBe(expected);
  });
});

describe("loadHomeHero", () => {
  it("combines the Seoul day period with a KMA observation", async () => {
    const now = new Date("2026-08-26T10:00:00.000Z");
    await expect(
      loadHomeHero(now, {
        getCurrentSeoulWeather: async () => ({
          temperatureC: 23.8,
          precipitation: "rain",
        }),
      }),
    ).resolves.toEqual({
      dayPeriod: "evening",
      weather: { temperatureC: 23.8, precipitation: "rain" },
    });
  });

  it("falls back to time-only content when weather is unavailable", async () => {
    const now = new Date("2026-08-26T10:00:00.000Z");
    await expect(
      loadHomeHero(now, {
        getCurrentSeoulWeather: async () => {
          throw new Error("weather offline");
        },
      }),
    ).resolves.toEqual({ dayPeriod: "evening" });
  });
});
