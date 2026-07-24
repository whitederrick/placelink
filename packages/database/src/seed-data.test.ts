import { describe, expect, it } from "vitest";
import { createSeedPlaces } from "./seed-data";

describe("createSeedPlaces", () => {
  it("creates the reproducible thirty-place development catalog", () => {
    const places = createSeedPlaces();
    expect(places).toHaveLength(30);
    expect(new Set(places.map((place) => place.id)).size).toBe(30);
    expect(new Set(places.map((place) => place.neighborhood)).size).toBe(5);
  });
});
