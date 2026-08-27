import { describe, expect, it, vi } from "vitest";
import {
  fetchCulturePortalEvents,
  normalizeCulturePortalEvent,
  parseCulturePortalEventsXml,
} from "./culture-portal-events";

const successXml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <comMsgHeader><returnReasonCode>00</returnReasonCode><returnAuthMsg>정상입니다.</returnAuthMsg></comMsgHeader>
  <msgBody>
    <totalCount>1</totalCount><cPage>1</cPage><rows>10</rows>
    <perforList>
      <seq>394040</seq><title>다시 보는 제헌절</title>
      <startDate>20260716</startDate><endDate>20261012</endDate>
      <place>대한민국역사박물관</place><realmName>전시</realmName><area>서울</area>
      <thumbnail>https://example.com/culture.jpg</thumbnail>
      <gpsX>126.9789</gpsX><gpsY>37.5738</gpsY>
    </perforList>
  </msgBody>
</response>`;

describe("Culture Portal event adapter", () => {
  it("parses a singleton XML list and preserves its total count", () => {
    expect(parseCulturePortalEventsXml(successXml)).toMatchObject({
      totalCount: 1,
      events: [{ seq: "394040", title: "다시 보는 제헌절" }],
    });
  });

  it("normalizes dates, coordinates, classification, and official provenance", () => {
    const [event] = parseCulturePortalEventsXml(successXml).events;
    expect(normalizeCulturePortalEvent(event!)).toMatchObject({
      provider: "CULTURE_PORTAL",
      externalId: "394040",
      happeningKind: "EXHIBITION",
      placeKind: "CULTURAL_VENUE",
      operatorType: "UNKNOWN",
      startsAt: "2026-07-15T15:00:00.000Z",
      endsAt: "2026-10-12T15:00:00.000Z",
      latitude: 37.5738,
      longitude: 126.9789,
    });
  });

  it("surfaces official service errors without exposing the API key", () => {
    const xml = `<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE ERROR</errMsg><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>`;
    expect(() => parseCulturePortalEventsXml(xml)).toThrow(
      "Culture Portal rejected the request (30: SERVICE_KEY_IS_NOT_REGISTERED_ERROR)",
    );
  });

  it("requests the official period endpoint with bounded paging", async () => {
    const fetcher: typeof fetch = vi.fn(async () => new Response(successXml));
    await expect(
      fetchCulturePortalEvents({
        apiKey: "encoded%2Bkey",
        from: "2026-08-27",
        to: "2027-08-27",
        rows: 100,
        fetcher,
      }),
    ).resolves.toMatchObject({ totalCount: 1 });
    const requestedUrl = String(vi.mocked(fetcher).mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("from=20260827&to=20270827");
    expect(requestedUrl).toContain("serviceKey=encoded%2Bkey");
  });

  it("rejects page sizes above the provider limit", async () => {
    await expect(
      fetchCulturePortalEvents({
        apiKey: "key",
        from: "2026-08-27",
        to: "2027-08-27",
        rows: 101,
      }),
    ).rejects.toThrow("Culture Portal rows must contain 1 to 100 records");
  });
});
