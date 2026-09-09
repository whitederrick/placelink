import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    placeMergeCandidate: { findFirst: vi.fn(), updateMany: vi.fn() },
    place: { findUnique: vi.fn(), update: vi.fn() },
    placeProviderRef: { update: vi.fn() },
    placeTranslation: { update: vi.fn() },
    placeOpeningPeriod: { delete: vi.fn(), update: vi.fn() },
    placeOpeningException: { delete: vi.fn(), update: vi.fn() },
    happening: { updateMany: vi.fn() },
    courseNode: { updateMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    placeTag: { upsert: vi.fn(), deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    getDatabase: vi.fn(() => ({
      $transaction: vi.fn((operation: (db: typeof tx) => Promise<unknown>) => operation(tx)),
    })),
  };
});

vi.mock("@placelink/database", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/auth/permissions", () => ({ requireStudioPermission: vi.fn() }));

import { mergePlaceMergeCandidate } from "./service";

const actor = { id: "admin-1", type: "HUMAN" as const, role: "ADMIN" as const };
const place = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  status: "ACTIVE",
  translations: [],
  providerRefs: [],
  tags: [],
  openingPeriods: [],
  openingExceptions: [],
  courseNodes: [],
  ...overrides,
});

describe("mergePlaceMergeCandidate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves all supported relations, deduplicates conflicts, and audits the merge", async () => {
    mocks.tx.placeMergeCandidate.findFirst.mockResolvedValue({
      id: "candidate-1", primaryPlaceId: "primary", duplicatePlaceId: "duplicate", reason: "same venue",
    });
    mocks.tx.place.findUnique
      .mockResolvedValueOnce(place("primary", {
        translations: [{ id: "en-primary", locale: "en" }],
        providerRefs: [{ provider: "KAKAO", externalId: "p-ref" }],
        tags: [{ tagId: "tag-shared" }],
        openingPeriods: [{ id: "period-primary", dayOfWeek: 1, opensAtMinutes: 600 }],
        openingExceptions: [{ id: "exception-primary", date: new Date("2026-09-01") }],
      }))
      .mockResolvedValueOnce(place("duplicate", {
        translations: [{ id: "ko-duplicate", locale: "ko" }, { id: "en-duplicate", locale: "en" }],
        providerRefs: [{ id: "provider-1", provider: "KAKAO", externalId: "d-ref" }],
        tags: [{ tagId: "tag-shared" }, { tagId: "tag-new" }],
        openingPeriods: [{ id: "period-duplicate", dayOfWeek: 1, opensAtMinutes: 600 }, { id: "period-new", dayOfWeek: 2, opensAtMinutes: 660 }],
      openingExceptions: [{ id: "exception-duplicate", date: new Date("2026-09-01") }, { id: "exception-new", date: new Date("2026-09-02") }],
        courseNodes: [{ id: "node-new", courseId: "course-1", orderIndex: 0 }],
      }));
    mocks.tx.placeMergeCandidate.updateMany.mockResolvedValue({ count: 1 });

    await expect(mergePlaceMergeCandidate(actor, "candidate-1", "approved merge")).resolves.toEqual({
      primaryPlaceId: "primary", mergedPlaceId: "duplicate",
    });
    expect(mocks.tx.placeProviderRef.update).toHaveBeenCalledWith({ where: { id: "provider-1" }, data: { placeId: "primary" } });
    expect(mocks.tx.placeTranslation.update).toHaveBeenCalledWith({ where: { id: "ko-duplicate" }, data: { placeId: "primary" } });
    expect(mocks.tx.placeOpeningPeriod.delete).toHaveBeenCalledWith({ where: { id: "period-duplicate" } });
    expect(mocks.tx.placeOpeningPeriod.update).toHaveBeenCalledWith({ where: { id: "period-new" }, data: { placeId: "primary" } });
    expect(mocks.tx.placeOpeningException.delete).toHaveBeenCalledWith({ where: { id: "exception-duplicate" } });
    expect(mocks.tx.placeTag.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { placeId_tagId: { placeId: "primary", tagId: "tag-new" } } }));
    expect(mocks.tx.happening.updateMany).toHaveBeenCalledWith({ where: { placeId: "duplicate" }, data: { placeId: "primary" } });
    expect(mocks.tx.courseNode.update).toHaveBeenCalledWith({ where: { id: "node-new" }, data: { placeId: "primary" } });
    expect(mocks.tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "place.merge.approved" }) }));
  });

  it("rejects a concurrent review and never records a successful audit", async () => {
    mocks.tx.placeMergeCandidate.findFirst.mockResolvedValue({ id: "candidate-1", primaryPlaceId: "primary", duplicatePlaceId: "duplicate", reason: "same" });
    mocks.tx.place.findUnique.mockResolvedValue(place("primary"));
    mocks.tx.place.findUnique.mockResolvedValueOnce(place("primary")).mockResolvedValueOnce(place("duplicate"));
    mocks.tx.placeMergeCandidate.updateMany.mockResolvedValue({ count: 0 });

    await expect(mergePlaceMergeCandidate(actor, "candidate-1", "race detected")).rejects.toMatchObject({ status: 409 });
    expect(mocks.tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects provider reference conflicts before moving relations", async () => {
    mocks.tx.placeMergeCandidate.findFirst.mockResolvedValue({
      id: "candidate-1", primaryPlaceId: "primary", duplicatePlaceId: "duplicate", reason: "same venue",
    });
    mocks.tx.place.findUnique
      .mockResolvedValueOnce(place("primary", { providerRefs: [{ provider: "KAKAO", externalId: "same-ref" }] }))
      .mockResolvedValueOnce(place("duplicate", { providerRefs: [{ id: "provider-1", provider: "KAKAO", externalId: "same-ref" }] }));

    await expect(mergePlaceMergeCandidate(actor, "candidate-1", "confirmed duplicate"))
      .rejects.toMatchObject({ status: 409 });
    expect(mocks.tx.placeProviderRef.update).not.toHaveBeenCalled();
    expect(mocks.tx.auditLog.create).not.toHaveBeenCalled();
  });
});
