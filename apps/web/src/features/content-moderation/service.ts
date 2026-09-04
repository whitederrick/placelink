import { getDatabase } from "@placelink/database";
import type { Actor } from "@/lib/auth/actor";
import { requireStudioPermission } from "@/lib/auth/permissions";
import { AppError, ErrorCode } from "@/lib/errors";
import { contentModerationRequestSchema, type ContentModerationRequest, type ContentTargetType } from "./schema";

export async function moderateContent(actor: Actor, targetType: ContentTargetType, id: string, rawInput: ContentModerationRequest, now = new Date()) {
  requireStudioPermission(actor, "studio.content.manage");
  const input = contentModerationRequestSchema.parse(rawInput);
  const database = getDatabase();
  return database.$transaction(async (transaction) => {
    if (targetType === "PLACE") {
      const before = await transaction.place.findUnique({ where: { id }, select: { status: true } });
      if (!before) throw new AppError(ErrorCode.INVALID_INPUT, "Content not found", 404);
      const status = input.action === "HIDE" ? "HIDDEN" : "ACTIVE";
      const updated = await transaction.place.update({ where: { id }, data: { status }, select: { status: true } });
      await transaction.auditLog.create({ data: { actorId: actor.id, actorType: actor.type, action: `content.${input.action.toLowerCase()}`, targetType: "Place", targetId: id, before, after: { ...updated, reason: input.reason } } });
      return { status: updated.status };
    }
    if (targetType === "HAPPENING") {
      const before = await transaction.happening.findUnique({ where: { id }, select: { status: true, startsAt: true, endsAt: true, isAnchor: true } });
      if (!before) throw new AppError(ErrorCode.HAPPENING_NOT_FOUND, "Happening not found", 404);
      const status = input.action === "HIDE" ? "HIDDEN" : before.endsAt < now ? "ENDED" : before.startsAt <= now ? "ACTIVE" : "UPCOMING";
      const updated = await transaction.happening.update({ where: { id }, data: { status, isAnchor: input.action === "HIDE" ? false : before.isAnchor }, select: { status: true } });
      await transaction.auditLog.create({ data: { actorId: actor.id, actorType: actor.type, action: `content.${input.action.toLowerCase()}`, targetType: "Happening", targetId: id, before, after: { ...updated, reason: input.reason } } });
      return { status: updated.status };
    }
    const before = await transaction.course.findUnique({ where: { id }, select: { status: true, publishedAt: true } });
    if (!before) throw new AppError(ErrorCode.INVALID_INPUT, "Content not found", 404);
    const status = input.action === "HIDE" ? "PRIVATE" : before.publishedAt ? "PUBLISHED" : "DRAFT";
    const updated = await transaction.course.update({ where: { id }, data: { status }, select: { status: true } });
    await transaction.auditLog.create({ data: { actorId: actor.id, actorType: actor.type, action: `content.${input.action.toLowerCase()}`, targetType: "Course", targetId: id, before, after: { ...updated, reason: input.reason } } });
    return { status: updated.status };
  });
}
