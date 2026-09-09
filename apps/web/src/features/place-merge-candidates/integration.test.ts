import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDatabase } from "@placelink/database";
import { mergePlaceMergeCandidate } from "./service";

const runIntegration = process.env.RUN_DB_INTEGRATION_TESTS === "true";
const describeIntegration = runIntegration ? describe : describe.skip;
const actor = { id: "integration-admin", type: "HUMAN" as const, role: "ADMIN" as const };
const suffix = `merge-it-${Date.now()}`;
const ids = { primary: `${suffix}-primary`, duplicate: `${suffix}-duplicate`, candidate: `${suffix}-candidate`, course: `${suffix}-course`, happening: `${suffix}-happening`, user: `${suffix}-user` };

describeIntegration("place merge PostgreSQL integration", () => {
  let database: ReturnType<typeof getDatabase>;

  beforeAll(async () => {
    database = getDatabase();
    await database.user.create({ data: { id: ids.user, nickname: "Merge integration user" } });
    await database.place.createMany({ data: [
      { id: ids.primary, sourceType: "EDITOR", category: "CAFE", lat: 37.5, lng: 127.0 },
      { id: ids.duplicate, sourceType: "EDITOR", category: "CAFE", lat: 37.5, lng: 127.0 },
    ] });
    await database.placeTranslation.createMany({ data: [
      { id: `${suffix}-ko-primary`, placeId: ids.primary, locale: "ko", name: "주 장소", address: "주소" },
      { id: `${suffix}-en-duplicate`, placeId: ids.duplicate, locale: "en", name: "Duplicate", address: "Address" },
    ] });
    await database.placeProviderRef.create({ data: { id: `${suffix}-provider`, placeId: ids.duplicate, provider: "KAKAO", externalId: suffix, sourceUrl: "https://example.com" } });
    await database.happening.create({ data: { id: ids.happening, placeId: ids.duplicate, sourceType: "EDITOR", startsAt: new Date("2030-01-01T00:00:00Z"), endsAt: new Date("2030-01-02T00:00:00Z") } });
    await database.course.create({ data: { id: ids.course, slug: suffix, title: "Integration course", creatorUserId: ids.user, nodes: { create: { placeId: ids.duplicate, orderIndex: 0 } } } });
    await database.placeMergeCandidate.create({ data: { id: ids.candidate, primaryPlaceId: ids.primary, duplicatePlaceId: ids.duplicate, candidateKey: suffix, reason: "integration fixture" } });
  });

  afterAll(async () => {
    if (!database) return;
    await database.placeMergeCandidate.deleteMany({ where: { id: ids.candidate } });
    await database.courseNode.deleteMany({ where: { courseId: ids.course } });
    await database.course.deleteMany({ where: { id: ids.course } });
    await database.happening.deleteMany({ where: { id: ids.happening } });
    await database.placeProviderRef.deleteMany({ where: { id: `${suffix}-provider` } });
    await database.placeTranslation.deleteMany({ where: { placeId: { in: [ids.primary, ids.duplicate] } } });
    await database.place.deleteMany({ where: { id: { in: [ids.primary, ids.duplicate] } } });
    await database.user.deleteMany({ where: { id: ids.user } });
  });

  it("moves relations and marks the duplicate merged in a real transaction", async () => {
    await mergePlaceMergeCandidate(actor, ids.candidate, "verified integration merge");
    const [primary, duplicate, candidate, courseNode, happening, provider, translation] = await Promise.all([
      database.place.findUnique({ where: { id: ids.primary }, select: { status: true } }),
      database.place.findUnique({ where: { id: ids.duplicate }, select: { status: true } }),
      database.placeMergeCandidate.findUnique({ where: { id: ids.candidate }, select: { status: true } }),
      database.courseNode.findFirst({ where: { courseId: ids.course }, select: { placeId: true } }),
      database.happening.findUnique({ where: { id: ids.happening }, select: { placeId: true } }),
      database.placeProviderRef.findUnique({ where: { id: `${suffix}-provider` }, select: { placeId: true } }),
      database.placeTranslation.findUnique({ where: { id: `${suffix}-en-duplicate` }, select: { placeId: true } }),
    ]);
    expect(primary?.status).toBe("ACTIVE");
    expect(duplicate?.status).toBe("MERGED");
    expect(candidate?.status).toBe("MERGED");
    expect(courseNode?.placeId).toBe(ids.primary);
    expect(happening?.placeId).toBe(ids.primary);
    expect(provider?.placeId).toBe(ids.primary);
    expect(translation?.placeId).toBe(ids.primary);
  });
});
