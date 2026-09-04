import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => {
  const transaction = {
    user: {
      findMany: vi.fn(),
      updateManyAndReturn: vi.fn(),
    },
    auditLog: { createMany: vi.fn() },
  };
  return {
    transaction,
    getDatabase: vi.fn(() => ({
      $transaction: vi.fn(
        (operation: (database: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    })),
  };
});

vi.mock("@placelink/database", () => ({
  getDatabase: databaseMocks.getDatabase,
}));

import { restoreExpiredUserSuspensionsTransaction } from "./queries";

const actor = {
  id: "user-suspension-expiry-cron",
  type: "AGENT" as const,
  role: "ADMIN" as const,
};

describe("expired user suspension recovery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("restores only the selected expired batch and writes one audit per user", async () => {
    const now = new Date("2026-09-04T00:00:00.000Z");
    databaseMocks.transaction.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        statusReason: "abuse",
        suspendedUntil: new Date("2026-09-03T00:00:00.000Z"),
        deletedAt: null,
      },
      {
        id: "user-2",
        statusReason: "spam",
        suspendedUntil: new Date("2026-09-03T12:00:00.000Z"),
        deletedAt: null,
      },
      {
        id: "user-next",
        statusReason: "next batch",
        suspendedUntil: new Date("2026-09-03T18:00:00.000Z"),
        deletedAt: null,
      },
    ]);
    databaseMocks.transaction.user.updateManyAndReturn.mockResolvedValue([
      { id: "user-1" },
      { id: "user-2" },
    ]);
    databaseMocks.transaction.auditLog.createMany.mockResolvedValue({
      count: 2,
    });

    await expect(
      restoreExpiredUserSuspensionsTransaction(actor, now, 2),
    ).resolves.toEqual({ restoredCount: 2, hasMore: true });
    expect(databaseMocks.transaction.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "SUSPENDED",
          suspendedUntil: { not: null, lte: now },
        },
        take: 3,
      }),
    );
    expect(
      databaseMocks.transaction.user.updateManyAndReturn,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ["user-1", "user-2"] } }),
        data: expect.objectContaining({
          status: "ACTIVE",
          suspendedUntil: null,
          statusChangedAt: now,
        }),
      }),
    );
    expect(databaseMocks.transaction.auditLog.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          actorId: actor.id,
          action: "user.status.auto_restored",
          targetId: "user-1",
        }),
        expect.objectContaining({ targetId: "user-2" }),
      ]),
    });
  });

  it("does not issue writes when no timed suspension has expired", async () => {
    databaseMocks.transaction.user.findMany.mockResolvedValue([]);

    await expect(
      restoreExpiredUserSuspensionsTransaction(actor, new Date(), 500),
    ).resolves.toEqual({ restoredCount: 0, hasMore: false });
    expect(
      databaseMocks.transaction.user.updateManyAndReturn,
    ).not.toHaveBeenCalled();
    expect(
      databaseMocks.transaction.auditLog.createMany,
    ).not.toHaveBeenCalled();
  });
});
