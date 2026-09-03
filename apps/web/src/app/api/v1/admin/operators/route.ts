import { NextResponse } from "next/server";
import { listStudioOperators } from "@/features/studio-operations";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const GET = withApiHandler(
  { auth: "permission", permission: "studio.roles.manage" },
  async (request, { actor }) => {
    if (!actor)
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    const search = request.nextUrl.searchParams;
    return NextResponse.json(
      await listStudioOperators(actor, {
        search: search.get("search") ?? undefined,
        cursor: search.get("cursor") ?? undefined,
        take: search.get("take") ?? undefined,
      }),
    );
  },
);
