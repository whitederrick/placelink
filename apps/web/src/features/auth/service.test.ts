import { describe, expect, it } from "vitest";
import { resolveActorRole } from "./role";

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
});
