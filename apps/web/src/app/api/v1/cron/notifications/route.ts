import { NextResponse } from "next/server";
import { processPendingNotificationDeliveries } from "@/features/notifications";
import { withApiHandler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(
  { auth: "agent", agentId: "notification-delivery-cron" },
  async () => NextResponse.json(await processPendingNotificationDeliveries()),
);
