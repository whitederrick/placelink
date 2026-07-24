import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  acceptInviteTransaction: vi.fn(),
  dissolveCoupleTransaction: vi.fn(),
  insertCoupleInvite: vi.fn(),
  selectCoupleStatus: vi.fn(),
  selectInvitePreview: vi.fn(),
}));
vi.mock("./queries", () => queryMocks);

import {
  acceptCoupleInvite,
  createCoupleInvite,
  dissolveCouple,
  loadCoupleInvite,
  loadCoupleStatus,
} from "./service";

const actor = { id: "user-2", type: "HUMAN" as const, role: "USER" as const };
const now = new Date("2026-07-22T00:00:00.000Z");
const token = "a".repeat(43);

describe("couple lifecycle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the active partner in couple status", async () => {
    queryMocks.selectCoupleStatus.mockResolvedValue({
      id: actor.id,
      coupleMemberships: [
        {
          coupleId: "couple-1",
          couple: {
            displayName: "민지❤️지훈",
            startedAt: now,
            members: [
              { userId: "user-1", user: { nickname: "민지" } },
              { userId: actor.id, user: { nickname: "지훈" } },
            ],
          },
        },
      ],
    });
    await expect(loadCoupleStatus(actor)).resolves.toMatchObject({
      data: { connected: true, couple: { partnerNickname: "민지" } },
    });
  });

  it("creates a seven-day invite and stores only a token hash", async () => {
    queryMocks.insertCoupleInvite.mockResolvedValue({
      expiresAt: new Date("2026-07-29T00:00:00.000Z"),
    });
    const result = await createCoupleInvite(
      actor,
      { startedAt: "2026-07-01", upgradeSoloCourses: true },
      "https://example.com",
      "ko",
      now,
    );
    expect(queryMocks.insertCoupleInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        inviterUserId: actor.id,
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        upgradeSoloCourses: true,
      }),
    );
    expect(result.data.inviteUrl).toMatch(
      /^https:\/\/example\.com\/ko\/couple\/invite\//,
    );
  });

  it("rejects a future start date", async () => {
    await expect(
      createCoupleInvite(
        actor,
        { startedAt: "2026-07-23", upgradeSoloCourses: false },
        "https://example.com",
        "ko",
        now,
      ),
    ).rejects.toMatchObject({ code: "INVALID_INPUT", status: 400 });
  });

  it("hides expired invitations", async () => {
    queryMocks.selectInvitePreview.mockResolvedValue({
      startedAt: now,
      expiresAt: now,
      acceptedAt: null,
      revokedAt: null,
      inviter: { nickname: "민지", status: "ACTIVE" },
    });
    await expect(loadCoupleInvite(token, now)).rejects.toMatchObject({
      code: "COUPLE_INVITE_NOT_FOUND",
      status: 404,
    });
  });

  it.each([
    ["INVALID", "COUPLE_INVITE_NOT_FOUND", 404],
    ["SELF", "INVALID_INPUT", 400],
    ["CONFLICT", "COUPLE_CONFLICT", 409],
  ])("maps %s acceptance to a domain error", async (kind, code, status) => {
    queryMocks.acceptInviteTransaction.mockResolvedValue({ kind });
    await expect(
      acceptCoupleInvite(actor, token, { upgradeSoloCourses: false }, now),
    ).rejects.toMatchObject({ code, status });
  });

  it("maps a concurrent unique-membership violation to a conflict", async () => {
    queryMocks.acceptInviteTransaction.mockRejectedValue({ code: "P2002" });
    await expect(
      acceptCoupleInvite(actor, token, { upgradeSoloCourses: false }, now),
    ).rejects.toMatchObject({ code: "COUPLE_CONFLICT", status: 409 });
  });

  it("returns the newly connected couple", async () => {
    queryMocks.acceptInviteTransaction.mockResolvedValue({
      kind: "CONNECTED",
      couple: { id: "couple-1", displayName: "민지❤️지훈", startedAt: now },
    });
    await expect(
      acceptCoupleInvite(actor, token, { upgradeSoloCourses: true }, now),
    ).resolves.toMatchObject({
      data: { connected: true, couple: { id: "couple-1" } },
    });
  });

  it("dissolves an active connection", async () => {
    queryMocks.dissolveCoupleTransaction.mockResolvedValue({
      coupleId: "couple-1",
    });
    await expect(dissolveCouple(actor, now)).resolves.toEqual({
      data: { connected: false },
    });
  });
});
