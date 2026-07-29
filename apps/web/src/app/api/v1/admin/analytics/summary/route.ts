import { NextResponse } from "next/server";
import {
  analyticsSummaryQuerySchema,
  loadAnalyticsSummary,
} from "@/features/analytics";
import { withApiHandler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withApiHandler({ auth: "admin" }, async (request) => {
  const query = analyticsSummaryQuerySchema.parse({
    days: request.nextUrl.searchParams.get("days") ?? undefined,
  });
  const summary = await loadAnalyticsSummary(query.days);
  return NextResponse.json({ data: summary });
});
