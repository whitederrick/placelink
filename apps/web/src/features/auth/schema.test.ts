import { describe, expect, it } from "vitest";
import { developmentUserIdSchema } from "./schema";

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
