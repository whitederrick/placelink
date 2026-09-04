import { NextResponse } from "next/server";
import { restoreExpiredUserSuspensions } from "@/features/studio-operations";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(
  { auth: "agent", agentId: "user-suspension-expiry-cron" },
  async (_request, { actor }) => {
    if (!actor) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    }
    return NextResponse.json(await restoreExpiredUserSuspensions(actor));
  },
);
