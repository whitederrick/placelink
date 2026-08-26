import { NextResponse } from "next/server";
import {
  anchorCurationRequestSchema,
  updateHappeningAnchor,
} from "@/features/admin-curation";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const PATCH = withApiHandler(
  { auth: "admin" },
  async (request, { actor }) => {
    if (!actor) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    }
    const happeningId = request.nextUrl.pathname.split("/").at(-2);
    if (!happeningId) {
      throw new AppError(ErrorCode.INVALID_INPUT, "Happening id required", 400);
    }
    const input = anchorCurationRequestSchema.parse(await request.json());
    return NextResponse.json(
      await updateHappeningAnchor(actor, happeningId, input),
    );
  },
);
