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
      const pageSize = 100;
      const firstPage = Math.floor((start - 1) / pageSize) + 1;
      const lastPage = Math.ceil(end / pageSize);
      const responses = [];
      for (let page = firstPage; page <= lastPage; page += 1) {
        const response = await fetchCulturePortalEvents({
          apiKey,
          from,
          to,
          page,
          rows: pageSize,
        });
        responses.push(response);
        if (page * pageSize >= response.totalCount) break;
      }
      const totalAvailable = responses[0]?.totalCount ?? 0;
      const fetched = responses.reduce(
        (count, response) => count + response.events.length,
        0,
      );
      const pageOffset = (firstPage - 1) * pageSize;
      const events = responses
        .flatMap((response) => response.events)
        .slice(start - 1 - pageOffset, end - pageOffset);
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
        totalAvailable,
        fetched,
        records,
      };
    },
  };
}
