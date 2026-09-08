import { getDatabase } from "@placelink/database";
import type { Actor } from "@/lib/auth/actor";
import { requireStudioPermission } from "@/lib/auth/permissions";
import { AppError, ErrorCode } from "@/lib/errors";

export async function listPlaceMergeCandidates(actor: Actor) {
  requireStudioPermission(actor, "studio.content.read");
  return getDatabase().placeMergeCandidate.findMany({
    where: { status: "OPEN" }, orderBy: [{ detectedAt: "desc" }, { id: "desc" }], take: 100,
    select: { id: true, reason: true, detectedAt: true, primaryPlace: { select: { translations: { where: { locale: "ko" }, take: 1, select: { name: true } } } }, duplicatePlace: { select: { translations: { where: { locale: "ko" }, take: 1, select: { name: true } } } } },
  });
}

export async function createPlaceMergeCandidate(actor: Actor, primaryPlaceId: string, duplicatePlaceId: string, reason: string) {
  requireStudioPermission(actor, "studio.content.manage");
  if (primaryPlaceId === duplicatePlaceId) throw new AppError(ErrorCode.INVALID_INPUT, "Places must differ", 400);
  const [left, right] = [primaryPlaceId, duplicatePlaceId].sort();
  const candidateKey = `${left}:${right}`;
  return getDatabase().placeMergeCandidate.upsert({ where: { candidateKey }, create: { primaryPlaceId, duplicatePlaceId, candidateKey, reason }, update: { status: "OPEN", reason, reviewedAt: null, reviewerId: null } });
}

export async function dismissPlaceMergeCandidate(actor: Actor, id: string, reason: string) {
  requireStudioPermission(actor, "studio.content.manage");
  const result = await getDatabase().placeMergeCandidate.updateMany({ where: { id, status: "OPEN" }, data: { status: "DISMISSED", reviewerId: actor.id, reviewedAt: new Date(), reason } });
  if (!result.count) throw new AppError(ErrorCode.INVALID_INPUT, "Open candidate not found", 404);
  await getDatabase().auditLog.create({ data: { actorId: actor.id, actorType: actor.type, action: "place_merge_candidate.dismissed", targetType: "PlaceMergeCandidate", targetId: id, after: { reason } } });
}

export async function mergePlaceMergeCandidate(actor: Actor, id: string, reason: string) {
  requireStudioPermission(actor, "studio.content.manage");
  if (reason.trim().length < 3) throw new AppError(ErrorCode.INVALID_INPUT, "Merge reason is required", 400);
  const db = getDatabase();
  return db.$transaction(async (tx) => {
    const candidate = await tx.placeMergeCandidate.findFirst({ where: { id, status: "OPEN" }, select: { id: true, primaryPlaceId: true, duplicatePlaceId: true, reason: true } });
    if (!candidate) throw new AppError(ErrorCode.INVALID_INPUT, "Open candidate not found", 404);
    const [primary, duplicate] = await Promise.all([
      tx.place.findUnique({ where: { id: candidate.primaryPlaceId }, include: { translations: true, providerRefs: true, tags: true, openingPeriods: true, openingExceptions: true, courseNodes: true } }),
      tx.place.findUnique({ where: { id: candidate.duplicatePlaceId }, include: { translations: true, providerRefs: true, tags: true, openingPeriods: true, openingExceptions: true, courseNodes: true } }),
    ]);
    if (!primary || !duplicate) throw new AppError(ErrorCode.INVALID_INPUT, "Place not found", 404);
    if (primary.status === "MERGED" || duplicate.status === "MERGED") throw new AppError(ErrorCode.INVALID_INPUT, "Place is already merged", 409);
    const duplicateProviders = new Set(primary.providerRefs.map((ref) => `${ref.provider}:${ref.externalId}`));
    if (duplicate.providerRefs.some((ref) => duplicateProviders.has(`${ref.provider}:${ref.externalId}`))) throw new AppError(ErrorCode.INVALID_INPUT, "Provider reference conflict", 409);
    await Promise.all(duplicate.providerRefs.map((ref) => tx.placeProviderRef.update({ where: { id: ref.id }, data: { placeId: primary.id } })));
    await Promise.all(duplicate.translations.map(async (translation) => {
      if (!primary.translations.some((item) => item.locale === translation.locale)) await tx.placeTranslation.update({ where: { id: translation.id }, data: { placeId: primary.id } });
    }));
    await Promise.all(duplicate.openingPeriods.map(async (period) => {
      const conflict = primary.openingPeriods.some((item) => item.dayOfWeek === period.dayOfWeek && item.opensAtMinutes === period.opensAtMinutes);
      if (conflict) await tx.placeOpeningPeriod.delete({ where: { id: period.id } });
      else await tx.placeOpeningPeriod.update({ where: { id: period.id }, data: { placeId: primary.id } });
    }));
    await Promise.all(duplicate.openingExceptions.map(async (exception) => {
      const conflict = primary.openingExceptions.some((item) => item.date.getTime() === exception.date.getTime());
      if (conflict) await tx.placeOpeningException.delete({ where: { id: exception.id } });
      else await tx.placeOpeningException.update({ where: { id: exception.id }, data: { placeId: primary.id } });
    }));
    await tx.happening.updateMany({ where: { placeId: duplicate.id }, data: { placeId: primary.id } });
    const primaryNodeKeys = new Set(primary.courseNodes.map((node) => `${node.courseId}:${node.orderIndex}`));
    const duplicateNodes = duplicate.courseNodes;
    await Promise.all(duplicateNodes.map((node) => primaryNodeKeys.has(`${node.courseId}:${node.orderIndex}`)
      ? tx.courseNode.delete({ where: { id: node.id } })
      : tx.courseNode.update({ where: { id: node.id }, data: { placeId: primary.id } })));
    await Promise.all(duplicate.tags.map((tag) => tx.placeTag.upsert({ where: { placeId_tagId: { placeId: primary.id, tagId: tag.tagId } }, create: { placeId: primary.id, tagId: tag.tagId }, update: {} })));
    await tx.placeTag.deleteMany({ where: { placeId: duplicate.id } });
    await tx.place.update({ where: { id: duplicate.id }, data: { status: "MERGED" } });
    const reviewed = await tx.placeMergeCandidate.updateMany({ where: { id, status: "OPEN" }, data: { status: "MERGED", reviewerId: actor.id, reviewedAt: new Date(), reason } });
    if (reviewed.count !== 1) throw new AppError(ErrorCode.INVALID_INPUT, "Candidate changed during merge", 409);
    await tx.auditLog.create({ data: { actorId: actor.id, actorType: actor.type, action: "place.merge.approved", targetType: "Place", targetId: primary.id, before: { duplicatePlaceId: duplicate.id, candidateReason: candidate.reason }, after: { status: "MERGED", reason, movedHappenings: true, movedCourseNodes: true } } });
    return { primaryPlaceId: primary.id, mergedPlaceId: duplicate.id };
  });
}
