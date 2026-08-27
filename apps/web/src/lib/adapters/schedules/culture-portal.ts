import {
  checksumPayload,
  fetchCulturePortalEvents,
  normalizeCulturePortalEvent,
} from "@placelink/database";
import type { ScheduleIngestionProvider } from "./types";

export function createCulturePortalScheduleProvider(
  apiKey: string,
): ScheduleIngestionProvider {
  return {
    async fetchBatch({ start, end, from, to }) {
      if (!from || !to)
        throw new Error("Culture Portal ingestion requires from and to dates");
      const response = await fetchCulturePortalEvents({
        apiKey,
        from,
        to,
        page: 1,
        rows: end,
      });
      const events = response.events.slice(start - 1, end);
      const records = events.map((rawPayload) => {
        const normalizedPayload = normalizeCulturePortalEvent(rawPayload);
        return {
          externalId: normalizedPayload.externalId,
          checksum: checksumPayload(rawPayload),
          sourceUrl: normalizedPayload.officialUrl,
          rawPayload,
          normalizedPayload,
        };
      });
      return {
        provider: "CULTURE_PORTAL",
        totalAvailable: response.totalCount,
        fetched: response.events.length,
        records,
      };
    },
  };
}
