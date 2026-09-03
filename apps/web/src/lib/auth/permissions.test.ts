import { describe, expect, it } from "vitest";
import { hasStudioPermission } from "./permissions";

describe("studio permissions", () => {
  it("limits support operators to user and support operations", () => {
    const actor = {
      id: "support-1",
      type: "HUMAN" as const,
      role: "ADMIN" as const,
      studioRole: "SUPPORT" as const,
    };
    expect(hasStudioPermission(actor, "studio.users.manage")).toBe(true);
    expect(hasStudioPermission(actor, "studio.support.manage")).toBe(true);
    expect(hasStudioPermission(actor, "studio.ingestions.manage")).toBe(false);
    expect(hasStudioPermission(actor, "studio.roles.manage")).toBe(false);
    expect(hasStudioPermission(actor, "studio.users.withdraw")).toBe(false);
  });

  it("keeps legacy admin actors fully authorized", () => {
    const actor = {
      id: "admin-1",
      type: "HUMAN" as const,
      role: "ADMIN" as const,
    };
    expect(hasStudioPermission(actor, "studio.roles.manage")).toBe(true);
  });

  it("never grants studio permissions to regular users", () => {
    const actor = {
      id: "user-1",
      type: "HUMAN" as const,
      role: "USER" as const,
    };
    expect(hasStudioPermission(actor, "studio.users.read")).toBe(false);
  });
});
