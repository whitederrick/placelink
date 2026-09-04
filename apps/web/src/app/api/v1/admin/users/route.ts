import { NextResponse } from "next/server";
import { listStudioUsers } from "@/features/studio-operations";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const GET = withApiHandler(
  { auth: "admin" },
  async (request, { actor }) => {
    if (!actor)
      throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
    return NextResponse.json(
      await listStudioUsers(actor, {
        search: request.nextUrl.searchParams.get("search") ?? undefined,
        status: request.nextUrl.searchParams.get("status") ?? undefined,
        provider: request.nextUrl.searchParams.get("provider") ?? undefined,
        cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
        take: request.nextUrl.searchParams.get("take") ?? undefined,
      }),
    );
  },
);
