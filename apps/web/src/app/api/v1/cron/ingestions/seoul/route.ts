import { NextResponse } from "next/server";
import { syncSeoulIngestions } from "@/features/ingestion-review";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

function currentSeoulDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export const GET = withApiHandler(
  { auth: "agent", agentId: "schedule-ingestion-cron" },
  async (_request, { actor }) => {
    if (!actor) {
      throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
    }
    const now = new Date();
    return NextResponse.json(
      await syncSeoulIngestions(
        actor,
        { start: 1, end: 1_000, from: currentSeoulDate(now) },
        undefined,
        now,
      ),
    );
  },
);
