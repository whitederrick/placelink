import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const authMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  loadHumanActor: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: authMocks.auth }));
vi.mock("@/features/auth", () => ({
  loadHumanActor: authMocks.loadHumanActor,
}));
vi.mock("@/lib/env", () => ({
  webEnv: {
    CRON_SECRET: "cron-secret-at-least-16",
    LOG_LEVEL: "silent",
  },
}));

import { withApiHandler } from "./with-api-handler";

describe("withApiHandler agent authentication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("injects an AGENT admin actor for a valid bearer secret", async () => {
    const handler = withApiHandler(
      { auth: "agent", agentId: "schedule-ingestion-cron" },
      async (_request, { actor }) => NextResponse.json({ actor }),
    );
    const response = await handler(
      new NextRequest("http://localhost/api/v1/cron/ingestions/seoul", {
        headers: { authorization: "Bearer cron-secret-at-least-16" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      actor: {
        id: "schedule-ingestion-cron",
        type: "AGENT",
        role: "ADMIN",
      },
    });
    expect(authMocks.auth).not.toHaveBeenCalled();
  });

  it("denies an invalid bearer secret before invoking the handler", async () => {
    const callback = vi.fn(async () => NextResponse.json({ ok: true }));
    const handler = withApiHandler(
      { auth: "agent", agentId: "schedule-ingestion-cron" },
      callback,
    );
    const response = await handler(
      new NextRequest("http://localhost/api/v1/cron/ingestions/seoul", {
        headers: { authorization: "Bearer wrong-secret-value" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
    expect(callback).not.toHaveBeenCalled();
  });

  it("enforces the requested Studio permission", async () => {
    authMocks.auth.mockResolvedValue({ user: { id: "support-1" } });
    authMocks.loadHumanActor.mockResolvedValue({
      id: "support-1",
      type: "HUMAN",
      role: "ADMIN",
      studioRole: "SUPPORT",
    });
    const callback = vi.fn(async () => NextResponse.json({ ok: true }));
    const handler = withApiHandler(
      { auth: "permission", permission: "studio.ingestions.manage" },
      callback,
    );
    const response = await handler(
      new NextRequest("http://localhost/api/v1/admin/ingestions/sync"),
    );

    expect(response.status).toBe(403);
    expect(callback).not.toHaveBeenCalled();
  });
});
