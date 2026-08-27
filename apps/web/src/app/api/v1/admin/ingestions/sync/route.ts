import { NextResponse } from "next/server";
import {
  ingestionSyncRequestSchema,
  syncSeoulIngestions,
} from "@/features/ingestion-review";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const POST = withApiHandler(
  { auth: "admin" },
  async (request, { actor }) => {
    if (!actor) {
      throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
    }
    const input = ingestionSyncRequestSchema.parse(await request.json());
    return NextResponse.json(await syncSeoulIngestions(actor, input));
  },
);
