import { describe, expect, it } from "vitest";
import { resolveActorRole } from "./role";

describe("resolveActorRole", () => {
  it("grants admin access only to an explicitly configured user id", () => {
    expect(resolveActorRole("user-admin", ["user-admin"])).toBe("ADMIN");
    expect(resolveActorRole("user-member", ["user-admin"])).toBe("USER");
  });
});
