import { describe, expect, it } from "vitest";
import { authenticationProfileSchema, developmentUserIdSchema } from "./schema";

describe("development user schema", () => {
  it.each(["seed-user-jihoon", "seed-user-minji"])(
    "allows the standard seed account %s",
    (userId) => {
      expect(developmentUserIdSchema.parse(userId)).toBe(userId);
    },
  );

  it("rejects arbitrary development account IDs", () => {
    expect(() => developmentUserIdSchema.parse("seed-user-admin")).toThrow();
  });
});

describe("authentication profile schema", () => {
  it("normalizes an operator email", () => {
    expect(
      authenticationProfileSchema.parse({
        provider: "GOOGLE",
        externalId: "google-account-1",
        nickname: "운영자",
        email: " Operator@Example.com ",
      }).email,
    ).toBe("operator@example.com");
  });
});
