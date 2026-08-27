import { NextResponse } from "next/server";
import {
  ingestionReviewRequestSchema,
  reviewIngestion,
} from "@/features/ingestion-review";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const PATCH = withApiHandler(
  { auth: "admin" },
  async (request, { actor }) => {
    if (!actor) {
      throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
    }
    const ingestionId = request.nextUrl.pathname.split("/").at(-2);
    if (!ingestionId) {
      throw new AppError(ErrorCode.INVALID_INPUT, "Ingestion id required", 400);
    }
    const input = ingestionReviewRequestSchema.parse(await request.json());
    return NextResponse.json(await reviewIngestion(actor, ingestionId, input));
  },
);
