import { getDatabase } from "@placelink/database";
import type { Actor } from "@/lib/auth/actor";

export async function expireEndedHappenings(actor: Actor, now = new Date()) {
  return getDatabase().$transaction(async (transaction) => {
    const result = await transaction.happening.updateMany({
      where: {
        status: { in: ["UPCOMING", "ACTIVE"] },
        endsAt: { lt: now },
      },
      data: { status: "ENDED", isAnchor: false },
    });
    if (result.count) {
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          actorType: actor.type,
          action: "happening.expiry_processed",
          targetType: "Happening",
          targetId: "batch",
          after: { expiredCount: result.count, processedAt: now.toISOString() },
        },
      });
    }
    return { expiredCount: result.count };
  });
}
