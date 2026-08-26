import { z } from "zod";
import type { WeatherProvider, WeatherSnapshot } from "./types";

const KMA_ENDPOINT =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";
const SEOUL_GRID = { nx: 60, ny: 127 } as const;
const PUBLISH_DELAY_MILLISECONDS = 40 * 60 * 1_000;
const CACHE_MILLISECONDS = 10 * 60 * 1_000;

const kmaResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
      resultMsg: z.string(),
    }),
    body: z
      .object({
        items: z.object({
          item: z.array(
            z.object({
              category: z.string(),
              obsrValue: z.coerce.number(),
            }),
          ),
        }),
      })
      .optional(),
  }),
});

function seoulDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function getKmaObservationBaseTime(now: Date) {
  const publishedTime = new Date(now.getTime() - PUBLISH_DELAY_MILLISECONDS);
  const parts = seoulDateParts(publishedTime);
  return {
    baseDate: `${parts.year}${parts.month}${parts.day}`,
    baseTime: `${parts.hour}00`,
  };
}

function normalizeServiceKey(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function precipitationFromCode(code: number): WeatherSnapshot["precipitation"] {
  if (code === 3 || code === 7) return "snow";
  if (code > 0) return "rain";
  return "none";
}

export function createKmaWeatherProvider(
  serviceKey: string,
  request: typeof fetch = fetch,
): WeatherProvider {
  let cache: { fetchedAt: number; snapshot: WeatherSnapshot } | undefined;

  return {
    async getCurrentSeoulWeather(now) {
      if (cache && now.getTime() - cache.fetchedAt < CACHE_MILLISECONDS) {
        return cache.snapshot;
      }
      const { baseDate, baseTime } = getKmaObservationBaseTime(now);
      const url = new URL(KMA_ENDPOINT);
      url.searchParams.set("serviceKey", normalizeServiceKey(serviceKey));
      url.searchParams.set("pageNo", "1");
      url.searchParams.set("numOfRows", "10");
      url.searchParams.set("dataType", "JSON");
      url.searchParams.set("base_date", baseDate);
      url.searchParams.set("base_time", baseTime);
      url.searchParams.set("nx", String(SEOUL_GRID.nx));
      url.searchParams.set("ny", String(SEOUL_GRID.ny));

      const response = await request(url.toString(), {
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) throw new Error("KMA weather request failed");
      const parsed = kmaResponseSchema.parse(await response.json());
      if (parsed.response.header.resultCode !== "00") {
        throw new Error(
          `KMA weather error: ${parsed.response.header.resultMsg}`,
        );
      }
      const items = parsed.response.body?.items.item ?? [];
      const temperatureC = items.find(
        (item) => item.category === "T1H",
      )?.obsrValue;
      const precipitationCode = items.find(
        (item) => item.category === "PTY",
      )?.obsrValue;
      if (temperatureC === undefined || precipitationCode === undefined) {
        throw new Error("KMA observation is incomplete");
      }
      const snapshot: WeatherSnapshot = {
        temperatureC,
        precipitation: precipitationFromCode(precipitationCode),
      };
      cache = { fetchedAt: now.getTime(), snapshot };
      return snapshot;
    },
  };
}
