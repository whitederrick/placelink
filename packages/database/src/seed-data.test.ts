import { describe, expect, it } from "vitest";
import { createSeedHappeningWindow, createSeedPlaces } from "./seed-data";

describe("createSeedPlaces", () => {
  it("creates the reproducible thirty-place development catalog", () => {
    const places = createSeedPlaces();
    expect(places).toHaveLength(30);
    expect(new Set(places.map((place) => place.id)).size).toBe(30);
    expect(new Set(places.map((place) => place.neighborhood)).size).toBe(5);
  });
});

describe("createSeedHappeningWindow", () => {
  it("keeps development anchors active relative to the seed run", () => {
    const now = new Date("2026-08-26T00:00:00.000Z");
    const window = createSeedHappeningWindow(now);

    expect(window.startsAt.getTime()).toBeLessThan(now.getTime());
    expect(window.endsAt.getTime()).toBeGreaterThan(now.getTime());
    expect(window).toEqual({
      startsAt: new Date("2026-08-19T00:00:00.000Z"),
      endsAt: new Date("2026-11-24T00:00:00.000Z"),
    });
  });
});
