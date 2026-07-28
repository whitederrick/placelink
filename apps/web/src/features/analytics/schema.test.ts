import { describe, expect, it } from "vitest";
import { analyticsEventRequestSchema } from "./schema";

describe("analyticsEventRequestSchema", () => {
  it("accepts known bounded events", () => {
    expect(
      analyticsEventRequestSchema.parse({
        name: "course.shared",
        properties: {
          courseSlug: "seongsu-date",
          locale: "ko",
          method: "native",
        },
      }),
    ).toMatchObject({ name: "course.shared" });
  });

  it("rejects arbitrary event names and properties", () => {
    expect(() =>
      analyticsEventRequestSchema.parse({
        name: "admin.secret",
        properties: { value: "anything" },
      }),
    ).toThrow();
  });
});
