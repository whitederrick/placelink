import { NextResponse } from "next/server";
import { expireEndedHappenings } from "@/features/happening-lifecycle";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(
  { auth: "agent", agentId: "happening-expiry-cron" },
  async (_request, { actor }) => {
    if (!actor)
      throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
    return NextResponse.json(await expireEndedHappenings(actor));
  },
);
