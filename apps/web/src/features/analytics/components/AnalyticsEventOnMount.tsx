"use client";

import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "../client";
import type { AnalyticsEventRequest } from "../schema";

export function AnalyticsEventOnMount({
  event,
}: {
  event: AnalyticsEventRequest;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackAnalyticsEvent(event.name, event.properties);
  }, [event]);
  return null;
}
