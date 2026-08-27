import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  checksumPayload: vi.fn(() => "culture-checksum"),
  fetchCulturePortalEvents: vi.fn(),
  normalizeCulturePortalEvent: vi.fn(),
}));
vi.mock("@placelink/database", () => databaseMocks);

import { createCulturePortalScheduleProvider } from "./culture-portal";

describe("Culture Portal schedule provider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adapts a bounded period response into staging records", async () => {
    const rawPayload = {
      seq: "394040",
      title: "다시 보는 제헌절",
      startDate: "20260716",
      endDate: "20261012",
      place: "대한민국역사박물관",
      realmName: "전시",
      area: "서울",
      thumbnail: "",
      gpsX: "126.9789",
      gpsY: "37.5738",
    };
    const normalizedPayload = {
      provider: "CULTURE_PORTAL" as const,
      externalId: "394040",
      officialUrl: "https://www.culture.go.kr/event/394040",
    };
    databaseMocks.fetchCulturePortalEvents.mockResolvedValue({
      totalCount: 20,
      events: [rawPayload],
    });
    databaseMocks.normalizeCulturePortalEvent.mockReturnValue(
      normalizedPayload,
    );

    const provider = createCulturePortalScheduleProvider("service-key");
    await expect(
      provider.fetchBatch({
        start: 1,
        end: 100,
        from: "2026-08-27",
        to: "2027-08-27",
      }),
    ).resolves.toEqual({
      provider: "CULTURE_PORTAL",
      totalAvailable: 20,
      fetched: 1,
      records: [
        {
          externalId: "394040",
          checksum: "culture-checksum",
          sourceUrl: normalizedPayload.officialUrl,
          rawPayload,
          normalizedPayload,
        },
      ],
    });
    expect(databaseMocks.fetchCulturePortalEvents).toHaveBeenCalledWith({
      apiKey: "service-key",
      from: "2026-08-27",
      to: "2027-08-27",
      page: 1,
      rows: 100,
    });
  });

  it("paginates requests without exceeding the provider page-size limit", async () => {
    databaseMocks.fetchCulturePortalEvents
      .mockResolvedValueOnce({ totalCount: 250, events: Array(100).fill({}) })
      .mockResolvedValueOnce({ totalCount: 250, events: Array(100).fill({}) })
      .mockResolvedValueOnce({ totalCount: 250, events: Array(50).fill({}) });
    databaseMocks.normalizeCulturePortalEvent.mockReturnValue({
      provider: "CULTURE_PORTAL",
      externalId: "event-id",
      officialUrl: "https://www.culture.go.kr/event/event-id",
    });

    const provider = createCulturePortalScheduleProvider("service-key");
    const result = await provider.fetchBatch({
      start: 1,
      end: 250,
      from: "2026-08-27",
      to: "2027-08-27",
    });

    expect(databaseMocks.fetchCulturePortalEvents).toHaveBeenCalledTimes(3);
    expect(databaseMocks.fetchCulturePortalEvents).toHaveBeenLastCalledWith({
      apiKey: "service-key",
      from: "2026-08-27",
      to: "2027-08-27",
      page: 3,
      rows: 100,
    });
    expect(result).toMatchObject({ totalAvailable: 250, fetched: 250 });
    expect(result.records).toHaveLength(250);
  });
});
