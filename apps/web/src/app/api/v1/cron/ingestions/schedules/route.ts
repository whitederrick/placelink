import { NextResponse } from "next/server";
import {
  syncCulturePortalIngestions,
  syncSeoulIngestions,
} from "@/features/ingestion-review";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";
import { webEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

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
    const providers = [
      { name: "SEOUL_OPEN_DATA", enabled: true },
      {
        name: "CULTURE_PORTAL",
        enabled: Boolean(webEnv.CULTURE_PORTAL_SERVICE_KEY),
      },
    ] as const;
    const [seoul, culturePortal] = await Promise.allSettled([
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

    const failedProviders = [seoul, culturePortal].flatMap((result, index) => {
      if (result.status !== "rejected" || !providers[index]?.enabled) return [];
      logger.error(
        {
          provider: providers[index].name,
          errorType:
            result.reason instanceof Error
              ? result.reason.name
              : "UnknownError",
          errorMessage:
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown provider error",
        },
        "schedule_ingestion.provider_failed",
      );
      return [providers[index].name];
    });
    if (failedProviders.length > 0) {
      throw new AppError(
        ErrorCode.INTEGRATION_FAILURE,
        `Schedule ingestion failed: ${failedProviders.join(", ")}`,
        502,
      );
    }

    return NextResponse.json({
      data: {
        seoul: seoul.status === "fulfilled" ? seoul.value.data : null,
        culturePortal:
          culturePortal.status === "fulfilled"
            ? culturePortal.value?.data ?? null
            : null,
      },
    });
  },
);
