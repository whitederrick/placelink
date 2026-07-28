import { NextResponse } from "next/server";
import { analyticsEventRequestSchema } from "@/features/analytics/schema";
import { recordAnalyticsEvent } from "@/features/analytics/service";
import { withApiHandler } from "@/lib/api";

export const POST = withApiHandler(
  { auth: "optional" },
  async (request, { actor }) => {
    const event = analyticsEventRequestSchema.parse(await request.json());
    await recordAnalyticsEvent(event, actor?.id);
    return NextResponse.json({ data: { accepted: true } }, { status: 202 });
  },
);
