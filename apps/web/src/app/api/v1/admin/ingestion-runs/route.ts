import { NextResponse } from "next/server";
import { listIngestionRuns } from "@/features/studio-operations";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const GET = withApiHandler(
  { auth: "admin" },
  async (request, { actor }) => {
    if (!actor)
      throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
    return NextResponse.json(
      await listIngestionRuns(actor, {
        provider: request.nextUrl.searchParams.get("provider") ?? undefined,
        status: request.nextUrl.searchParams.get("status") ?? undefined,
        cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
        take: request.nextUrl.searchParams.get("take") ?? undefined,
      }),
    );
  },
);
