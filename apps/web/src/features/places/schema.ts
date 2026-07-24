import { z } from "zod";

export const placeLocaleSchema = z.enum(["ko", "en"]);
export const placeAreaSchema = z.enum([
  "seongsu",
  "yeonnam",
  "seochon",
  "hannam",
  "mangwon",
]);
export const placeCategorySchema = z.enum([
  "EXHIBITION",
  "CAFE",
  "SHOP",
  "RESTAURANT",
  "ACTIVITY",
  "BAR",
]);

export const placeListQuerySchema = z.object({
  locale: placeLocaleSchema.default("ko"),
  query: z.string().trim().min(1).max(50).optional(),
  area: placeAreaSchema.optional(),
  category: placeCategorySchema.optional(),
  cursor: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).default(20),
});

export const nearbyPlacesQuerySchema = z.object({
  locale: placeLocaleSchema.default("ko"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().int().min(100).max(5000).default(1500),
  category: placeCategorySchema.optional(),
  take: z.coerce.number().int().min(1).max(50).default(30),
});

export const mapPlacesQuerySchema = z
  .object({
    locale: placeLocaleSchema.default("ko"),
    south: z.coerce.number().min(-90).max(90),
    west: z.coerce.number().min(-180).max(180),
    north: z.coerce.number().min(-90).max(90),
    east: z.coerce.number().min(-180).max(180),
    category: placeCategorySchema.optional(),
    take: z.coerce.number().int().min(1).max(50).default(50),
  })
  .superRefine((bounds, context) => {
    if (bounds.south >= bounds.north)
      context.addIssue({
        code: "custom",
        message: "south must be below north",
        path: ["south"],
      });
    if (bounds.west >= bounds.east)
      context.addIssue({
        code: "custom",
        message: "west must be left of east",
        path: ["west"],
      });
    if (bounds.north - bounds.south > 1 || bounds.east - bounds.west > 1) {
      context.addIssue({
        code: "custom",
        message: "map viewport is too large",
        path: ["north"],
      });
    }
  });

export const placeSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  summary: z.string().nullable().optional(),
  area: placeAreaSchema.nullable(),
  category: placeCategorySchema,
  lat: z.number(),
  lng: z.number(),
  distanceMeters: z.number().nonnegative().optional(),
});

export const placeListResponseSchema = z.object({
  data: z.array(placeSummarySchema),
  meta: z.object({ nextCursor: z.string().optional() }),
});

export const nearbyPlacesResponseSchema = z.object({
  data: z.array(placeSummarySchema),
  meta: z.object({ radiusMeters: z.number().int() }),
});

export const mapPlacesResponseSchema = z.object({
  data: z.array(placeSummarySchema),
  meta: z.object({ capped: z.boolean() }),
});

export type PlaceLocale = z.infer<typeof placeLocaleSchema>;
export type PlaceListQuery = z.infer<typeof placeListQuerySchema>;
export type NearbyPlacesQuery = z.infer<typeof nearbyPlacesQuerySchema>;
export type MapPlacesQuery = z.infer<typeof mapPlacesQuerySchema>;
export type PlaceSummary = z.infer<typeof placeSummarySchema>;
