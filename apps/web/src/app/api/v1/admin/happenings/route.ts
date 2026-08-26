import { NextResponse } from "next/server";
import { listHappeningsForCuration } from "@/features/admin-curation";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(
  { auth: "admin" },
  async (request, { actor }) => {
    if (!actor) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    }
    const query = {
      locale: request.nextUrl.searchParams.get("locale") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      anchor: request.nextUrl.searchParams.get("anchor") ?? undefined,
      take: request.nextUrl.searchParams.get("take") ?? undefined,
    };
    return NextResponse.json(await listHappeningsForCuration(actor, query));
  },
);
