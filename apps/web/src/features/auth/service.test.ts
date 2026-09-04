import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  insertAuthenticatedUser: vi.fn(),
  restoreExpiredSuspensionForUser: vi.fn(),
  selectUserByIdentity: vi.fn(),
  selectUserForActor: vi.fn(),
  updateAuthenticatedUserEmail: vi.fn(),
}));
vi.mock("./queries", () => queryMocks);
vi.mock("../../lib/env", () => ({
  webEnv: { ADMIN_USER_IDS: [], STUDIO_OPERATOR_EMAILS: [] },
}));

import { resolveActorRole } from "./role";
import { resolveStudioRole } from "./role";
import {
  ensureAuthenticatedUser,
  loadDevelopmentUser,
  loadHumanActor,
} from "./service";

beforeEach(() => vi.clearAllMocks());

describe("resolveActorRole", () => {
  it("grants admin access only to an explicitly configured user id", () => {
    expect(resolveActorRole("user-admin", null, ["user-admin"], [])).toBe(
      "ADMIN",
    );
    expect(resolveActorRole("user-member", null, ["user-admin"], [])).toBe(
      "USER",
    );
  });

  it("grants studio access to a normalized operator email", () => {
    expect(
      resolveActorRole(
        "user-member",
        "Operator@Example.com",
        [],
        ["operator@example.com"],
      ),
    ).toBe("ADMIN");
  });

  it("uses a persisted least-privilege studio role", () => {
    expect(resolveActorRole("user-support", null, [], [], "SUPPORT")).toBe(
      "ADMIN",
    );
    expect(resolveStudioRole("user-support", null, [], [], "SUPPORT")).toBe(
      "SUPPORT",
    );
  });
});

describe("loadHumanActor", () => {
  it("restores an expired timed suspension before creating the actor", async () => {
    const now = new Date("2026-09-04T00:00:00.000Z");
    queryMocks.selectUserForActor
      .mockResolvedValueOnce({
        id: "user-1",
        email: null,
        nickname: "민지",
        status: "SUSPENDED",
        suspendedUntil: new Date("2026-09-03T00:00:00.000Z"),
        studioRole: null,
      })
      .mockResolvedValueOnce({
        id: "user-1",
        email: null,
        nickname: "민지",
        status: "ACTIVE",
        suspendedUntil: null,
        studioRole: null,
      });
    queryMocks.restoreExpiredSuspensionForUser.mockResolvedValue(true);

    await expect(loadHumanActor("user-1", now)).resolves.toMatchObject({
      id: "user-1",
      type: "HUMAN",
      role: "USER",
    });
    expect(queryMocks.restoreExpiredSuspensionForUser).toHaveBeenCalledWith(
      "user-1",
      now,
    );
  });

  it("keeps indefinite suspensions blocked", async () => {
    queryMocks.selectUserForActor.mockResolvedValue({
      id: "user-1",
      email: null,
      nickname: "민지",
      status: "SUSPENDED",
      suspendedUntil: null,
      studioRole: null,
    });

    await expect(loadHumanActor("user-1")).resolves.toBeNull();
    expect(queryMocks.restoreExpiredSuspensionForUser).not.toHaveBeenCalled();
  });

  it("restores an expired suspension during social sign-in", async () => {
    const now = new Date("2026-09-04T00:00:00.000Z");
    queryMocks.selectUserByIdentity
      .mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "user@example.test",
          nickname: "민지",
          status: "SUSPENDED",
          suspendedUntil: new Date("2026-09-03T00:00:00.000Z"),
        },
      })
      .mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "user@example.test",
          nickname: "민지",
          status: "ACTIVE",
          suspendedUntil: null,
        },
      });
    queryMocks.restoreExpiredSuspensionForUser.mockResolvedValue(true);

    await expect(
      ensureAuthenticatedUser(
        {
          provider: "GOOGLE",
          externalId: "google-1",
          nickname: "민지",
          email: "user@example.test",
        },
        now,
      ),
    ).resolves.toMatchObject({ id: "user-1", status: "ACTIVE" });
  });

  it("restores an expired suspension during development sign-in", async () => {
    const now = new Date("2026-09-04T00:00:00.000Z");
    queryMocks.selectUserForActor
      .mockResolvedValueOnce({
        id: "seed-user-minji",
        email: null,
        nickname: "민지",
        status: "SUSPENDED",
        suspendedUntil: new Date("2026-09-03T00:00:00.000Z"),
        studioRole: null,
      })
      .mockResolvedValueOnce({
        id: "seed-user-minji",
        email: null,
        nickname: "민지",
        status: "ACTIVE",
        suspendedUntil: null,
        studioRole: null,
      });
    queryMocks.restoreExpiredSuspensionForUser.mockResolvedValue(true);

    await expect(
      loadDevelopmentUser("seed-user-minji", now),
    ).resolves.toMatchObject({ status: "ACTIVE" });
  });
});
