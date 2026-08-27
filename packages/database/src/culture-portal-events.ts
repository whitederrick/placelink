import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import {
  normalizedCulturalEventSchema,
  type NormalizedCulturalEvent,
} from "./cultural-events";

const stringValueSchema = z.preprocess(
  (value) => (typeof value === "number" ? String(value) : value),
  z.string(),
);

const culturePortalEventSchema = z
  .object({
    seq: stringValueSchema.pipe(z.string().min(1)),
    title: stringValueSchema.pipe(z.string().min(1)),
    startDate: stringValueSchema,
    endDate: stringValueSchema,
    place: stringValueSchema.pipe(z.string().min(1)),
    realmName: stringValueSchema.default(""),
    area: stringValueSchema.default(""),
    thumbnail: stringValueSchema.default(""),
    gpsX: stringValueSchema.default(""),
    gpsY: stringValueSchema.default(""),
  })
  .passthrough();

const eventListSchema = z
  .union([culturePortalEventSchema, z.array(culturePortalEventSchema)])
  .optional()
  .transform((value) =>
    value ? (Array.isArray(value) ? value : [value]) : [],
  );

const culturePortalResponseSchema = z.object({
  response: z.object({
    comMsgHeader: z
      .object({
        returnReasonCode: stringValueSchema,
        returnAuthMsg: stringValueSchema.optional(),
        errMsg: stringValueSchema.optional(),
      })
      .optional(),
    msgBody: z.object({
      totalCount: stringValueSchema.transform(Number),
      perforList: eventListSchema,
    }),
  }),
});

const culturePortalErrorSchema = z.object({
  OpenAPI_ServiceResponse: z.object({
    cmmMsgHeader: z.object({
      returnReasonCode: stringValueSchema,
      returnAuthMsg: stringValueSchema.optional(),
      errMsg: stringValueSchema.optional(),
    }),
  }),
});

export type CulturePortalEvent = z.infer<typeof culturePortalEventSchema>;

function toKoreaDayBoundary(value: string, exclusiveEnd: boolean) {
  const compact = value.trim().replaceAll("-", "");
  const match = compact.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match)
    throw new Error(`Unsupported Culture Portal event date: ${value}`);
  const [, year, month, day] = match;
  const instant = new Date(`${year}-${month}-${day}T00:00:00+09:00`);
  if (exclusiveEnd) instant.setUTCDate(instant.getUTCDate() + 1);
  return instant.toISOString();
}

function nullableCoordinate(value: string, minimum: number, maximum: number) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) &&
    coordinate >= minimum &&
    coordinate <= maximum &&
    coordinate !== 0
    ? coordinate
    : null;
}

function nullableUrl(value: string) {
  const normalized = value.trim();
  return normalized && z.string().url().safeParse(normalized).success
    ? normalized
    : null;
}

function classifyHappening(realmName: string, title: string) {
  const value = `${realmName} ${title}`;
  if (value.includes("팝업")) return "POPUP" as const;
  if (value.includes("전시") || value.includes("미술"))
    return "EXHIBITION" as const;
  if (value.includes("축제")) return "FESTIVAL" as const;
  if (value.includes("영화") || value.includes("상영"))
    return "SCREENING" as const;
  if (value.includes("교육") || value.includes("체험"))
    return "WORKSHOP" as const;
  if (
    [
      "공연",
      "연극",
      "뮤지컬",
      "오페라",
      "콘서트",
      "음악",
      "클래식",
      "국악",
      "무용",
      "발레",
    ].some((keyword) => value.includes(keyword))
  )
    return "PERFORMANCE" as const;
  return "EVENT" as const;
}

export function normalizeCulturePortalEvent(
  input: CulturePortalEvent,
): NormalizedCulturalEvent {
  const event = culturePortalEventSchema.parse(input);
  return normalizedCulturalEventSchema.parse({
    provider: "CULTURE_PORTAL",
    externalId: event.seq,
    title: event.title.trim(),
    categoryLabel: event.realmName.trim(),
    happeningKind: classifyHappening(event.realmName, event.title),
    placeName: event.place.trim(),
    placeKind: "CULTURAL_VENUE",
    operatorType: "UNKNOWN",
    district: event.area.trim(),
    startsAt: toKoreaDayBoundary(event.startDate, false),
    endsAt: toKoreaDayBoundary(event.endDate, true),
    scheduleText: null,
    latitude: nullableCoordinate(event.gpsY, -90, 90),
    longitude: nullableCoordinate(event.gpsX, -180, 180),
    officialUrl: `https://www.culture.go.kr/portal/cltInfo/oneCltInfo/oneCltInfoView.do?menuNo=200010&pblprfrSn=${encodeURIComponent(event.seq)}`,
    bookingUrl: null,
    imageUrl: nullableUrl(event.thumbnail),
    organizer: null,
    audience: null,
    feeText: null,
    isFree: null,
    inquiry: null,
  });
}

export function parseCulturePortalEventsXml(xml: string) {
  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
  });
  const raw = parser.parse(xml) as unknown;
  const serviceError = culturePortalErrorSchema.safeParse(raw);
  if (serviceError.success) {
    const header = serviceError.data.OpenAPI_ServiceResponse.cmmMsgHeader;
    throw new Error(
      `Culture Portal rejected the request (${header.returnReasonCode}: ${header.returnAuthMsg ?? header.errMsg ?? "unknown error"})`,
    );
  }
  const parsed = culturePortalResponseSchema.parse(raw);
  const header = parsed.response.comMsgHeader;
  if (header && header.returnReasonCode !== "00")
    throw new Error(
      `Culture Portal rejected the request (${header.returnReasonCode}: ${header.returnAuthMsg ?? header.errMsg ?? "unknown error"})`,
    );
  if (
    !Number.isInteger(parsed.response.msgBody.totalCount) ||
    parsed.response.msgBody.totalCount < 0
  )
    throw new Error("Culture Portal returned an invalid total count");
  return {
    totalCount: parsed.response.msgBody.totalCount,
    events: parsed.response.msgBody.perforList,
  };
}

function encodedServiceKey(apiKey: string) {
  return /%[0-9a-f]{2}/i.test(apiKey) ? apiKey : encodeURIComponent(apiKey);
}

export async function fetchCulturePortalEvents({
  apiKey,
  from,
  to,
  page = 1,
  rows = 100,
  fetcher = fetch,
}: {
  apiKey: string;
  from: string;
  to: string;
  page?: number;
  rows?: number;
  fetcher?: typeof fetch;
}) {
  if (!Number.isInteger(page) || page < 1)
    throw new Error("Culture Portal page must be a positive integer");
  if (!Number.isInteger(rows) || rows < 1 || rows > 100)
    throw new Error("Culture Portal rows must contain 1 to 100 records");
  const date = (value: string) => value.replaceAll("-", "");
  const params = new URLSearchParams({
    from: date(from),
    to: date(to),
    cPage: String(page),
    rows: String(rows),
    place: "",
    gpsxfrom: "",
    gpsyfrom: "",
    gpsxto: "",
    gpsyto: "",
    keyword: "",
    sortStdr: "1",
  });
  const url = `https://apis.data.go.kr/B553457/nopenapi/rest/publicperformancedisplays/period?${params.toString()}&serviceKey=${encodedServiceKey(apiKey)}`;
  const response = await fetcher(url, { signal: AbortSignal.timeout(10_000) });
  const body = await response.text();
  if (!response.ok) {
    try {
      parseCulturePortalEventsXml(body);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.startsWith("Culture Portal rejected the request")
      )
        throw error;
    }
    throw new Error(`Culture Portal request failed (${response.status})`);
  }
  return parseCulturePortalEventsXml(body);
}
