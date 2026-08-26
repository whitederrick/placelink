import { describe, expect, it } from "vitest";
import { getHallWindowStart } from "./queries";
import { homeFeedQuerySchema } from "./schema";

describe("hall of fame period", () => {
  it("defaults the public feed to the weekly ranking", () => {
    expect(homeFeedQuerySchema.parse({}).ranking).toBe("weekly");
    expect(homeFeedQuerySchema.parse({ ranking: "monthly" }).ranking).toBe(
      "monthly",
    );
  });

  it("uses 7-day and 30-day scrap windows", () => {
    const now = new Date("2026-08-26T12:00:00.000Z");
    expect(getHallWindowStart(now, "weekly").toISOString()).toBe(
      "2026-08-19T12:00:00.000Z",
    );
    expect(getHallWindowStart(now, "monthly").toISOString()).toBe(
      "2026-07-27T12:00:00.000Z",
    );
  });
});
