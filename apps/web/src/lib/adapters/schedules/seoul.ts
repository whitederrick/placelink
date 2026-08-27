import {
  checksumPayload,
  fetchSeoulCulturalEvents,
  normalizeSeoulCulturalEvent,
} from "@placelink/database";
import type { ScheduleIngestionProvider } from "./types";

function seoulCalendarDate(value: string, exclusiveEnd = false) {
  const instant = new Date(value);
  if (exclusiveEnd) instant.setTime(instant.getTime() - 1);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function createSeoulScheduleProvider(
  apiKey: string,
): ScheduleIngestionProvider {
  return {
    async fetchBatch({ start, end, from, to }) {
      const response = await fetchSeoulCulturalEvents({ apiKey, start, end });
      const records = response.events
        .map((rawPayload) => ({
          rawPayload,
          normalizedPayload: normalizeSeoulCulturalEvent(rawPayload),
        }))
        .filter(({ normalizedPayload }) => {
          const startsOn = seoulCalendarDate(normalizedPayload.startsAt);
          const endsOn = seoulCalendarDate(normalizedPayload.endsAt, true);
          return (!from || endsOn >= from) && (!to || startsOn <= to);
        })
        .map(({ rawPayload, normalizedPayload }) => ({
          externalId: normalizedPayload.externalId,
          checksum: checksumPayload(rawPayload),
          sourceUrl: normalizedPayload.officialUrl,
          rawPayload,
          normalizedPayload,
        }));
      return {
        provider: "SEOUL_OPEN_DATA",
        totalAvailable: response.totalCount,
        fetched: response.events.length,
        records,
      };
    },
  };
}
