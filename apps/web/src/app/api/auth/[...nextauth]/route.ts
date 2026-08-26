import { handlers } from "@/auth";
import { webEnv } from "@/lib/env";
import type { NextRequest } from "next/server";

function unavailable() {
  return Response.json(
    { error: "AUTH_LOGIN_DISABLED", message: "Login is not available yet." },
    { status: 503 },
  );
}

export function GET(request: NextRequest) {
  const pathname = new URL(request.url).pathname;
  if (!webEnv.AUTH_LOGIN_ENABLED && !pathname.endsWith("/session"))
    return unavailable();
  return handlers.GET(request);
}

export function POST(request: NextRequest) {
  if (!webEnv.AUTH_LOGIN_ENABLED) return unavailable();
  return handlers.POST(request);
}
