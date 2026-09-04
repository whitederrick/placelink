import { NextResponse } from "next/server";
import { listSupportCases } from "@/features/support-cases";
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
      await listSupportCases(actor, {
        search: request.nextUrl.searchParams.get("search") ?? undefined,
        type: request.nextUrl.searchParams.get("type") ?? undefined,
        priority: request.nextUrl.searchParams.get("priority") ?? undefined,
        status: request.nextUrl.searchParams.get("status") ?? undefined,
        cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
        take: request.nextUrl.searchParams.get("take") ?? undefined,
      }),
    );
  },
);
