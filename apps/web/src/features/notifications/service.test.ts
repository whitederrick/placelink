import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findMany: vi.fn(),
  getDatabase: vi.fn(),
}));

vi.mock("@placelink/database", () => ({
  getDatabase: mocks.getDatabase,
}));
vi.mock("@/lib/adapters/email/resend", () => ({
  sendEmailWithResend: vi.fn(),
}));
vi.mock("@/lib/env", () => ({
  webEnv: { RESEND_API_KEY: undefined, EMAIL_FROM: undefined },
}));

import { processPendingNotificationDeliveries } from "./service";

describe("notification delivery worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({
      notificationDelivery: {
        updateMany: mocks.updateMany,
        findMany: mocks.findMany,
      },
    });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findMany.mockResolvedValue([]);
  });

  it("reclaims stale sending deliveries before selecting retry candidates", async () => {
    await expect(processPendingNotificationDeliveries()).resolves.toEqual({
      processed: 0,
      sent: 0,
      failed: 0,
      pending: 0,
    });
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "SENDING", lockedAt: expect.objectContaining({ lte: expect.any(Date) }) }),
      data: expect.objectContaining({ status: "FAILED", lockedAt: null, nextAttemptAt: expect.any(Date) }),
    }));
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { in: ["PENDING", "FAILED"] } }),
    }));
  });
});
