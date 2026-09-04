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
