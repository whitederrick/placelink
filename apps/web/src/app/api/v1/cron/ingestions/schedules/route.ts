import { NextResponse } from "next/server";
import {
  syncCulturePortalIngestions,
  syncSeoulIngestions,
} from "@/features/ingestion-review";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";
import { webEnv } from "@/lib/env";

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
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    }
    const now = new Date();
    const from = currentSeoulDate(now);
    const [seoul, culturePortal] = await Promise.all([
      syncSeoulIngestions(
        actor,
        { start: 1, end: 1_000, from },
        undefined,
        now,
      ),
      webEnv.CULTURE_PORTAL_SERVICE_KEY
        ? syncCulturePortalIngestions(
            actor,
            { provider: "CULTURE_PORTAL", start: 1, end: 1_000, from },
            undefined,
            now,
          )
        : Promise.resolve(null),
    ]);
    return NextResponse.json({
      data: {
        seoul: seoul.data,
        culturePortal: culturePortal?.data ?? null,
      },
    });
  },
);
