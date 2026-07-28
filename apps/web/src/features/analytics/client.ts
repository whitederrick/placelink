"use client";

import type { AnalyticsEventRequest } from "./schema";

export function trackAnalyticsEvent(
  name: AnalyticsEventRequest["name"],
  properties: AnalyticsEventRequest["properties"],
) {
  void fetch("/api/v1/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, properties }),
    keepalive: true,
  }).catch(() => undefined);
}
