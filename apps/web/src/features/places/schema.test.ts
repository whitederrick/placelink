import { describe, expect, it } from "vitest";
import { mapPlacesQuerySchema, nearbyPlacesQuerySchema, placeListQuerySchema } from "./schema";

describe("place query contracts", () => {
  it("normalizes a list query and applies bounded defaults", () => {
    expect(placeListQuerySchema.parse({ locale: "ko", query: "  성수  ", area: "seongsu" })).toEqual({
      locale: "ko",
      query: "성수",
      area: "seongsu",
      take: 20
    });
  });

  it("rejects unsupported areas and oversized pages", () => {
    expect(placeListQuerySchema.safeParse({ area: "gangnam" }).success).toBe(false);
    expect(placeListQuerySchema.safeParse({ take: 51 }).success).toBe(false);
  });

  it("bounds PostGIS search coordinates and radius", () => {
    expect(nearbyPlacesQuerySchema.safeParse({ lat: 37.54, lng: 127.05, radiusMeters: 1500 }).success).toBe(true);
    expect(nearbyPlacesQuerySchema.safeParse({ lat: 91, lng: 127.05 }).success).toBe(false);
    expect(nearbyPlacesQuerySchema.safeParse({ lat: 37.54, lng: 127.05, radiusMeters: 5001 }).success).toBe(false);
  });

  it("accepts a bounded map viewport and rejects oversized or inverted bounds", () => {
    expect(mapPlacesQuerySchema.safeParse({ south: 37.5, west: 126.9, north: 37.6, east: 127.1 }).success).toBe(true);
    expect(mapPlacesQuerySchema.safeParse({ south: 37.6, west: 126.9, north: 37.5, east: 127.1 }).success).toBe(false);
    expect(mapPlacesQuerySchema.safeParse({ south: 36, west: 126, north: 38, east: 128 }).success).toBe(false);
  });
});
