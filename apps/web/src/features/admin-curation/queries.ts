import { getDatabase } from "@placelink/database";
import type { Actor } from "../../lib/auth/actor";
import type { HappeningCurationListQuery } from "./schema";

export async function selectHappeningsForCuration(
  query: HappeningCurationListQuery,
) {
  return getDatabase().happening.findMany({
    where: {
      status: query.status,
      isAnchor: query.anchor,
      kind: query.kind,
      ...(query.q ? { translations: { some: { title: { contains: query.q, mode: "insensitive" } } } } : {}),
    },
    orderBy: [{ endsAt: "asc" }, { id: "asc" }],
    take: query.take,
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      isAnchor: true,
      translations: {
        where: { locale: query.locale },
        take: 1,
        select: { title: true },
      },
      place: {
        select: {
          translations: {
            where: { locale: query.locale },
            take: 1,
            select: { name: true },
          },
        },
      },
    },
  });
}

export function selectHappeningForCuration(id: string) {
  return getDatabase().happening.findUnique({
    where: { id },
    select: {
      id: true, status: true, kind: true, startsAt: true, endsAt: true, isAnchor: true,
      translations: { orderBy: { locale: "asc" }, select: { locale: true, title: true, description: true, scheduleText: true } },
      providerRefs: { orderBy: { provider: "asc" }, select: { provider: true, externalId: true, sourceUrl: true, bookingUrl: true, lastFetchedAt: true } },
      place: { select: { id: true, translations: { select: { locale: true, name: true, address: true } } } },
    },
  });
}

export async function updateHappeningAnchorTransaction(
  actor: Actor,
  happeningId: string,
  isAnchor: boolean,
) {
  const database = getDatabase();
  return database.$transaction(async (transaction) => {
    const happening = await transaction.happening.findUnique({
      where: { id: happeningId },
      select: { id: true, isAnchor: true },
    });
    if (!happening) return null;
    if (happening.isAnchor === isAnchor) {
      return { ...happening, changed: false };
    }

    const updated = await transaction.happening.update({
      where: { id: happeningId },
      data: { isAnchor },
      select: { id: true, isAnchor: true },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        actorType: actor.type,
        action: isAnchor
          ? "happening.anchor_assigned"
          : "happening.anchor_removed",
        targetType: "Happening",
        targetId: happeningId,
        before: { isAnchor: happening.isAnchor },
        after: { isAnchor },
      },
    });
    return { ...updated, changed: true };
  });
}
