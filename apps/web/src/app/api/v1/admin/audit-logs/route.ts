import { NextResponse } from "next/server";
import { listAuditLogs } from "@/features/studio-operations";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const GET = withApiHandler(
  { auth: "admin" },
  async (request, { actor }) => {
    if (!actor)
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    return NextResponse.json(
      await listAuditLogs(actor, {
        search: request.nextUrl.searchParams.get("search") ?? undefined,
        actorType: request.nextUrl.searchParams.get("actorType") ?? undefined,
        targetType: request.nextUrl.searchParams.get("targetType") ?? undefined,
        cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
        take: request.nextUrl.searchParams.get("take") ?? undefined,
      }),
    );
  },
);
