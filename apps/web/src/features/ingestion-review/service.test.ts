import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  selectIngestionsForReview: vi.fn(),
  selectIngestionForReview: vi.fn(),
  mergeIngestionTransaction: vi.fn(),
  rejectIngestionTransaction: vi.fn(),
  stageIngestionBatch: vi.fn(),
}));
vi.mock("./queries", () => queryMocks);
vi.mock("../../lib/env", () => ({ webEnv: {} }));

import {
  listIngestionsForReview,
  reviewIngestion,
  syncSeoulIngestions,
} from "./service";

const admin = { id: "admin-1", type: "HUMAN" as const, role: "ADMIN" as const };
const user = { id: "user-1", type: "HUMAN" as const, role: "USER" as const };
const normalized = {
  provider: "SEOUL_OPEN_DATA",
  externalId: "158731",
  title: "파인캐릭터 2026",
  categoryLabel: "전시/미술",
  happeningKind: "EXHIBITION",
  placeName: "동대문디자인플라자",
  placeKind: "CULTURAL_VENUE",
  operatorType: "UNKNOWN",
  district: "중구",
  startsAt: "2026-11-26T15:00:00.000Z",
  endsAt: "2026-11-29T15:00:00.000Z",
  scheduleText: "10:00 ~ 19:00",
  latitude: 37.567357,
  longitude: 127.009779,
  officialUrl: "https://culture.seoul.go.kr/event?cultcode=158731",
  bookingUrl: "https://example.com/tickets",
  imageUrl: "https://example.com/image.jpg",
  organizer: "서울시",
  audience: "누구나",
  feeText: "무료",
  isFree: true,
  inquiry: null,
};

describe("ingestion review", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-admin callers", async () => {
    await expect(listIngestionsForReview(user)).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });

  it("lists normalized records through the bounded response contract", async () => {
    queryMocks.selectIngestionsForReview.mockResolvedValue({
      records: [
        {
          id: "ingestion-1",
          provider: "SEOUL_OPEN_DATA",
          externalId: "158731",
          status: "NORMALIZED",
          normalizedPayload: normalized,
          fetchedAt: new Date("2026-08-27T01:00:00.000Z"),
        },
      ],
      nextCursor: undefined,
    });
    await expect(listIngestionsForReview(admin)).resolves.toMatchObject({
      data: [
        {
          id: "ingestion-1",
          title: "파인캐릭터 2026",
          happeningKind: "EXHIBITION",
        },
      ],
    });
  });

  it("merges an approved record with reviewed classifications", async () => {
    queryMocks.selectIngestionForReview.mockResolvedValue({
      id: "ingestion-1",
      status: "NORMALIZED",
      normalizedPayload: normalized,
    });
    queryMocks.mergeIngestionTransaction.mockResolvedValue({
      outcome: "merged",
      placeId: "place-1",
      happeningId: "happening-1",
    });

    await expect(
      reviewIngestion(
        admin,
        "ingestion-1",
        { decision: "MERGE", operatorType: "PUBLIC" },
        new Date("2026-08-27T02:00:00.000Z"),
      ),
    ).resolves.toEqual({
      data: {
        id: "ingestion-1",
        status: "MERGED",
        placeId: "place-1",
        happeningId: "happening-1",
      },
    });
    expect(queryMocks.mergeIngestionTransaction).toHaveBeenCalledWith(
      admin,
      "ingestion-1",
      expect.objectContaining({
        placeKind: "CULTURAL_VENUE",
        happeningKind: "EXHIBITION",
        operatorType: "PUBLIC",
        category: "EXHIBITION",
      }),
    );
  });

  it("requires a reason and audits rejection through the transaction", async () => {
    queryMocks.selectIngestionForReview.mockResolvedValue({
      id: "ingestion-1",
      status: "NORMALIZED",
      normalizedPayload: normalized,
    });
    queryMocks.rejectIngestionTransaction.mockResolvedValue(true);
    await expect(
      reviewIngestion(admin, "ingestion-1", {
        decision: "REJECT",
        reason: "데이트 콘텐츠와 관련 없음",
      }),
    ).resolves.toEqual({
      data: { id: "ingestion-1", status: "REJECTED" },
    });
  });

  it("stages a bounded provider batch and reports duplicate records", async () => {
    const provider = {
      fetchBatch: vi.fn().mockResolvedValue({
        provider: "SEOUL_OPEN_DATA" as const,
        totalAvailable: 300,
        fetched: 100,
        records: [
          {
            externalId: normalized.externalId,
            checksum: "checksum-1",
            sourceUrl: normalized.officialUrl,
            rawPayload: { TITLE: normalized.title },
            normalizedPayload: normalized,
          },
        ],
      }),
    };
    queryMocks.stageIngestionBatch.mockResolvedValue({ inserted: 0 });
    const now = new Date("2026-08-27T03:00:00.000Z");

    await expect(
      syncSeoulIngestions(
        admin,
        { start: 1, end: 100, from: "2026-08-27" },
        provider,
        now,
      ),
    ).resolves.toEqual({
      data: {
        provider: "SEOUL_OPEN_DATA",
        fetched: 100,
        selected: 1,
        inserted: 0,
        unchanged: 1,
        totalAvailable: 300,
        fetchedAt: now.toISOString(),
      },
    });
    expect(provider.fetchBatch).toHaveBeenCalledWith({
      start: 1,
      end: 100,
      from: "2026-08-27",
    });
    expect(queryMocks.stageIngestionBatch).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ provider: "SEOUL_OPEN_DATA" }),
      now,
    );
  });

  it("reports missing provider configuration without attempting a write", async () => {
    await expect(syncSeoulIngestions(admin, {})).rejects.toMatchObject({
      code: "INTEGRATION_NOT_CONFIGURED",
      status: 503,
    });
    expect(queryMocks.stageIngestionBatch).not.toHaveBeenCalled();
  });
});
