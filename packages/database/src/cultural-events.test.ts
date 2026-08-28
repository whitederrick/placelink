import { describe, expect, it, vi } from "vitest";
import {
  fetchSeoulCulturalEvents,
  normalizeSeoulCulturalEvent,
  type SeoulCulturalEvent,
} from "./cultural-events";

const event: SeoulCulturalEvent = {
  CODENAME: "전시/미술",
  GUNAME: "중구",
  TITLE: "파인캐릭터 2026",
  DATE: "2026-11-27~2026-11-29",
  PLACE: "동대문디자인플라자",
  ORG_NAME: "기타",
  USE_TRGT: "누구나",
  USE_FEE: "",
  INQUIRY: "02-000-0000",
  ORG_LINK: "https://example.com/tickets",
  MAIN_IMG: "https://example.com/image.jpg",
  STRTDATE: "2026-11-27 00:00:00.0",
  END_DATE: "2026-11-29 00:00:00.0",
  LOT: "127.009779",
  LAT: "37.567357",
  IS_FREE: "무료",
  HMPG_ADDR: "https://culture.seoul.go.kr/event?cultcode=158731",
  PRO_TIME: "10:00 ~ 19:00",
};

describe("normalizeSeoulCulturalEvent", () => {
  it("preserves provenance and separates content, venue, and operator types", () => {
    expect(normalizeSeoulCulturalEvent(event)).toMatchObject({
      provider: "SEOUL_OPEN_DATA",
      externalId: "158731",
      happeningKind: "EXHIBITION",
      placeKind: "CULTURAL_VENUE",
      operatorType: "UNKNOWN",
      scheduleText: "10:00 ~ 19:00",
      isFree: true,
      startsAt: "2026-11-26T15:00:00.000Z",
      endsAt: "2026-11-29T15:00:00.000Z",
    });
  });

  it("does not infer public ownership merely because the source is public", () => {
    expect(normalizeSeoulCulturalEvent(event).operatorType).toBe("UNKNOWN");
  });
});

describe("fetchSeoulCulturalEvents", () => {
  it("validates the provider response without exposing the API key", async () => {
    const fetcher: typeof fetch = vi.fn(async () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            culturalEventInfo: {
              list_total_count: 1,
              RESULT: { CODE: "INFO-000", MESSAGE: "정상 처리되었습니다" },
              row: [event],
            },
          }),
        ),
      ),
    );
    const result = await fetchSeoulCulturalEvents({
      apiKey: "secret-key",
      fetcher,
    });
    expect(result.events).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("rejects unbounded page requests", async () => {
    await expect(
      fetchSeoulCulturalEvents({ apiKey: "key", start: 1, end: 1_001 }),
    ).rejects.toThrow("1 to 1,000 rows");
  });
});
