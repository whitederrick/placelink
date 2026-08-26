import { describe, expect, it } from "vitest";
import { publicCourseSchema, updateCourseDraftRequestSchema } from "./schema";

const placeNode = (placeId: string, dayIndex: number) => ({
  placeId,
  dayIndex,
  durationMinutes: 60,
});

describe("multi-day course contract", () => {
  it("accepts a one-to-three-day route with flexible target stops", () => {
    const result = updateCourseDraftRequestSchema.safeParse({
      dayCount: 3,
      dayStartMinutes: 540,
      dayEndMinutes: 1320,
      targetStopCount: 9,
      nodes: [
        placeNode("place-1", 1),
        placeNode("place-2", 2),
        placeNode("place-3", 3),
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects nodes outside the selected day count", () => {
    const result = updateCourseDraftRequestSchema.safeParse({
      dayCount: 2,
      dayStartMinutes: 600,
      dayEndMinutes: 1320,
      targetStopCount: 4,
      nodes: [placeNode("place-1", 1), placeNode("place-2", 3)],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an impractical daily time range or more than eight stops per day", () => {
    const shortDay = updateCourseDraftRequestSchema.safeParse({
      dayCount: 1,
      dayStartMinutes: 600,
      dayEndMinutes: 720,
      targetStopCount: 2,
      nodes: [placeNode("place-1", 1), placeNode("place-2", 1)],
    });
    const crowdedDay = updateCourseDraftRequestSchema.safeParse({
      dayCount: 2,
      dayStartMinutes: 600,
      dayEndMinutes: 1320,
      targetStopCount: 10,
      nodes: Array.from({ length: 9 }, (_, index) =>
        placeNode(`place-${index + 1}`, 1),
      ),
    });

    expect(shortDay.success).toBe(false);
    expect(crowdedDay.success).toBe(false);
  });

  it("accepts a published multi-day route with more than eight total stops", () => {
    const nodes = Array.from({ length: 9 }, (_, index) => ({
      id: `node-${index + 1}`,
      orderIndex: index,
      dayIndex: index < 5 ? 1 : 2,
      durationMinutes: 60,
      arrivalMinutes: 600 + (index % 5) * 75,
      tip: null,
      distanceMeters: index === 0 || index === 5 ? null : 1_000,
      walkMinutes: index === 0 || index === 5 ? null : 13,
      place: {
        id: `place-${index + 1}`,
        name: `Place ${index + 1}`,
        address: "Seoul",
        area: "seongsu",
        category: "CAFE",
        lat: 37.5,
        lng: 127,
      },
      happening: null,
    }));

    const result = publicCourseSchema.safeParse({
      slug: "two-day-course",
      title: "Two day course",
      description: null,
      ownerName: "PlaceLink",
      durationMinutes: 660,
      dayCount: 2,
      dayStartMinutes: 600,
      dayEndMinutes: 1320,
      targetStopCount: 9,
      scrapCount: 0,
      publishedAt: "2026-08-26T00:00:00.000Z",
      tags: [],
      nodes,
    });

    expect(result.success).toBe(true);
  });
});
