import { createHash } from "node:crypto";
import { z } from "zod";

const seoulCulturalEventSchema = z.object({
  CODENAME: z.string(),
  GUNAME: z.string(),
  TITLE: z.string().min(1),
  DATE: z.string(),
  PLACE: z.string().min(1),
  ORG_NAME: z.string(),
  USE_TRGT: z.string(),
  USE_FEE: z.string(),
  INQUIRY: z.string(),
  ORG_LINK: z.string(),
  MAIN_IMG: z.string(),
  STRTDATE: z.string(),
  END_DATE: z.string(),
  LOT: z.string(),
  LAT: z.string(),
  IS_FREE: z.string(),
  HMPG_ADDR: z.string(),
  PRO_TIME: z.string(),
});

const seoulCulturalEventsResponseSchema = z.object({
  culturalEventInfo: z.object({
    list_total_count: z.number().int().nonnegative(),
    RESULT: z.object({ CODE: z.string(), MESSAGE: z.string() }),
    row: z.array(seoulCulturalEventSchema).default([]),
  }),
});

export const normalizedCulturalEventSchema = z.object({
  provider: z.enum(["SEOUL_OPEN_DATA", "CULTURE_PORTAL"]),
  externalId: z.string().min(1),
  title: z.string().min(1),
  categoryLabel: z.string(),
  happeningKind: z.enum([
    "EXHIBITION",
    "POPUP",
    "FESTIVAL",
    "PERFORMANCE",
    "SCREENING",
    "WORKSHOP",
    "EVENT",
    "OTHER",
  ]),
  placeName: z.string().min(1),
  placeKind: z.literal("CULTURAL_VENUE"),
  operatorType: z.literal("UNKNOWN"),
  district: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  scheduleText: z.string().nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  officialUrl: z.string().url().nullable(),
  bookingUrl: z.string().url().nullable(),
  imageUrl: z.string().url().nullable(),
  organizer: z.string().nullable(),
  audience: z.string().nullable(),
  feeText: z.string().nullable(),
  isFree: z.boolean().nullable(),
  inquiry: z.string().nullable(),
});

export type SeoulCulturalEvent = z.infer<typeof seoulCulturalEventSchema>;
export type NormalizedCulturalEvent = z.infer<
  typeof normalizedCulturalEventSchema
>;

function nullableText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function nullableUrl(value: string): string | null {
  const normalized = nullableText(value);
  return normalized && z.string().url().safeParse(normalized).success
    ? normalized
    : null;
}

function nullableCoordinate(value: string): number | null {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function toKoreaDayBoundary(value: string, exclusiveEnd: boolean): string {
  const date = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!date) throw new Error(`Unsupported Seoul event date: ${value}`);
  const instant = new Date(`${date}T00:00:00+09:00`);
  if (exclusiveEnd) instant.setUTCDate(instant.getUTCDate() + 1);
  return instant.toISOString();
}

function classifyHappening(category: string, title: string) {
  const value = `${category} ${title}`;
  if (value.includes("팝업")) return "POPUP" as const;
  if (value.includes("전시") || value.includes("미술"))
    return "EXHIBITION" as const;
  if (value.includes("축제")) return "FESTIVAL" as const;
  if (value.includes("영화") || value.includes("상영"))
    return "SCREENING" as const;
  if (value.includes("교육") || value.includes("체험"))
    return "WORKSHOP" as const;
  if (
    ["공연", "연극", "뮤지컬", "콘서트", "클래식", "국악", "무용"].some(
      (keyword) => value.includes(keyword),
    )
  )
    return "PERFORMANCE" as const;
  return "EVENT" as const;
}

function externalIdFor(event: SeoulCulturalEvent): string {
  const cultureCode = event.HMPG_ADDR.match(/[?&]cultcode=(\d+)/)?.[1];
  if (cultureCode) return cultureCode;
  return createHash("sha256")
    .update(`${event.TITLE}\u0000${event.STRTDATE}\u0000${event.PLACE}`)
    .digest("hex")
    .slice(0, 24);
}

export function normalizeSeoulCulturalEvent(
  input: SeoulCulturalEvent,
): NormalizedCulturalEvent {
  const event = seoulCulturalEventSchema.parse(input);
  return normalizedCulturalEventSchema.parse({
    provider: "SEOUL_OPEN_DATA",
    externalId: externalIdFor(event),
    title: event.TITLE.trim(),
    categoryLabel: event.CODENAME.trim(),
    happeningKind: classifyHappening(event.CODENAME, event.TITLE),
    placeName: event.PLACE.trim(),
    placeKind: "CULTURAL_VENUE",
    operatorType: "UNKNOWN",
    district: event.GUNAME.trim(),
    startsAt: toKoreaDayBoundary(event.STRTDATE, false),
    endsAt: toKoreaDayBoundary(event.END_DATE, true),
    scheduleText: nullableText(event.PRO_TIME),
    latitude: nullableCoordinate(event.LAT),
    longitude: nullableCoordinate(event.LOT),
    officialUrl: nullableUrl(event.HMPG_ADDR),
    bookingUrl: nullableUrl(event.ORG_LINK),
    imageUrl: nullableUrl(event.MAIN_IMG),
    organizer: nullableText(event.ORG_NAME),
    audience: nullableText(event.USE_TRGT),
    feeText: nullableText(event.USE_FEE),
    isFree:
      event.IS_FREE === "무료" ? true : event.IS_FREE === "유료" ? false : null,
    inquiry: nullableText(event.INQUIRY),
  });
}

export function checksumPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function fetchSeoulCulturalEvents({
  apiKey,
  start = 1,
  end = 100,
  fetcher = fetch,
}: {
  apiKey: string;
  start?: number;
  end?: number;
  fetcher?: typeof fetch;
}) {
  if (start < 1 || end < start || end - start + 1 > 1_000)
    throw new Error("Seoul event range must contain 1 to 1,000 rows");

  const url = `http://openapi.seoul.go.kr:8088/${encodeURIComponent(apiKey)}/json/culturalEventInfo/${start}/${end}`;
  const response = await fetcher(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok)
    throw new Error(`Seoul Open Data request failed (${response.status})`);

  const parsed = seoulCulturalEventsResponseSchema.parse(await response.json());
  if (parsed.culturalEventInfo.RESULT.CODE !== "INFO-000")
    throw new Error(
      `Seoul Open Data rejected the request (${parsed.culturalEventInfo.RESULT.CODE})`,
    );
  return {
    totalCount: parsed.culturalEventInfo.list_total_count,
    events: parsed.culturalEventInfo.row,
  };
}
