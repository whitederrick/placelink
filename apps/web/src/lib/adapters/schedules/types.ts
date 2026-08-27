import type { NormalizedCulturalEvent } from "@placelink/database";

export interface ScheduleIngestionRequest {
  start: number;
  end: number;
  from?: string;
  to?: string;
}

export interface ScheduleIngestionRecord {
  externalId: string;
  checksum: string;
  sourceUrl: string | null;
  rawPayload: unknown;
  normalizedPayload: NormalizedCulturalEvent;
}

export interface ScheduleIngestionBatch {
  provider: "SEOUL_OPEN_DATA";
  totalAvailable: number;
  fetched: number;
  records: ScheduleIngestionRecord[];
}

export interface ScheduleIngestionProvider {
  fetchBatch(request: ScheduleIngestionRequest): Promise<ScheduleIngestionBatch>;
}
