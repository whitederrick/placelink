import { NextResponse } from "next/server";
import { listIngestionsForReview } from "@/features/ingestion-review";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(
  { auth: "admin" },
  async (request, { actor }) => {
    if (!actor) {
      throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
    }
    const search = request.nextUrl.searchParams;
    return NextResponse.json(
      await listIngestionsForReview(actor, {
        status: search.get("status") ?? undefined,
        provider: search.get("provider") ?? undefined,
        happeningKind: search.get("happeningKind") ?? undefined,
        operatorType: search.get("operatorType") ?? undefined,
        cursor: search.get("cursor") ?? undefined,
        take: search.get("take") ?? undefined,
      }),
    );
  },
);
