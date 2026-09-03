import type { Actor } from "../../lib/auth/actor";
import { requireStudioPermission } from "../../lib/auth/permissions";
import { AppError, ErrorCode } from "../../lib/errors";
import {
  anchorCurationRequestSchema,
  anchorCurationResponseSchema,
  happeningCurationListQuerySchema,
  happeningCurationListResponseSchema,
  type AnchorCurationRequest,
} from "./schema";
import {
  selectHappeningsForCuration,
  updateHappeningAnchorTransaction,
} from "./queries";

export async function listHappeningsForCuration(
  actor: Actor,
  rawQuery: unknown = {},
) {
  requireStudioPermission(actor, "studio.content.read");
  const query = happeningCurationListQuerySchema.parse(rawQuery);
  const records = await selectHappeningsForCuration(query);
  return happeningCurationListResponseSchema.parse({
    data: records.map((record) => ({
      id: record.id,
      title: record.translations[0]?.title ?? record.id,
      placeName: record.place.translations[0]?.name ?? record.id,
      status: record.status,
      startsAt: record.startsAt.toISOString(),
      endsAt: record.endsAt.toISOString(),
      isAnchor: record.isAnchor,
    })),
  });
}

export async function updateHappeningAnchor(
  actor: Actor,
  happeningId: string,
  rawInput: AnchorCurationRequest,
) {
  requireStudioPermission(actor, "studio.content.manage");
  const input = anchorCurationRequestSchema.parse(rawInput);
  const result = await updateHappeningAnchorTransaction(
    actor,
    happeningId,
    input.isAnchor,
  );
  if (!result) {
    throw new AppError(
      ErrorCode.HAPPENING_NOT_FOUND,
      "Happening not found",
      404,
    );
  }
  return anchorCurationResponseSchema.parse({ data: result });
}
