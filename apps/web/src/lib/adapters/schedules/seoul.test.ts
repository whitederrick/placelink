import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  fetchSeoulCulturalEvents: vi.fn(),
  normalizeSeoulCulturalEvent: vi.fn(),
  checksumPayload: vi.fn(),
}));
vi.mock("@placelink/database", () => databaseMocks);

import { createSeoulScheduleProvider } from "./seoul";

describe("Seoul schedule adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters normalized records by the requested date window", async () => {
    const raw = { TITLE: "서울 전시" };
    databaseMocks.fetchSeoulCulturalEvents.mockResolvedValue({
      totalCount: 25,
      events: [raw],
    });
    databaseMocks.normalizeSeoulCulturalEvent.mockReturnValue({
      provider: "SEOUL_OPEN_DATA",
      externalId: "event-1",
      startsAt: "2026-09-01T15:00:00.000Z",
      endsAt: "2026-09-08T15:00:00.000Z",
      officialUrl: "https://example.com/event-1",
    });
    databaseMocks.checksumPayload.mockReturnValue("checksum-1");

    const result = await createSeoulScheduleProvider("secret").fetchBatch({
      start: 1,
      end: 10,
      from: "2026-09-01",
      to: "2026-09-30",
    });

    expect(databaseMocks.fetchSeoulCulturalEvents).toHaveBeenCalledWith({
      apiKey: "secret",
      start: 1,
      end: 10,
    });
    expect(result).toMatchObject({
      provider: "SEOUL_OPEN_DATA",
      totalAvailable: 25,
      fetched: 1,
      records: [
        {
          externalId: "event-1",
          checksum: "checksum-1",
          sourceUrl: "https://example.com/event-1",
          rawPayload: raw,
        },
      ],
    });
  });
});
