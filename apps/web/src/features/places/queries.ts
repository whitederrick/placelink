import { getDatabase } from "@placelink/database";
import type {
  MapPlacesQuery,
  NearbyPlacesQuery,
  PlaceListQuery,
} from "./schema";

const hideDemoPlaces = process.env.NODE_ENV === "production";

export async function selectPlaceRecords(query: PlaceListQuery) {
  return getDatabase().place.findMany({
    where: {
      status: "ACTIVE",
      id: hideDemoPlaces ? { not: { startsWith: "seed-place-" } } : undefined,
      areaSlug: query.area,
      category: query.category,
      translations: query.query
        ? {
            some: {
              locale: query.locale,
              OR: [
                { name: { contains: query.query, mode: "insensitive" } },
                { address: { contains: query.query, mode: "insensitive" } },
              ],
            },
          }
        : undefined,
    },
    orderBy: { id: "asc" },
    cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0,
    take: query.take + 1,
    select: {
      id: true,
      areaSlug: true,
      category: true,
      lat: true,
      lng: true,
      translations: {
        where: { locale: query.locale },
        take: 1,
        select: { name: true, address: true, summary: true },
      },
    },
  });
}

export interface NearbyPlaceRecord {
  id: string;
  areaSlug: string | null;
  category: string;
  lat: number;
  lng: number;
  name: string;
  address: string;
  summary: string | null;
  distanceMeters: number;
}

export async function selectNearbyPlaceRecords(
  query: NearbyPlacesQuery,
): Promise<NearbyPlaceRecord[]> {
  const database = getDatabase();
  return database.$queryRaw<NearbyPlaceRecord[]>`
    SELECT
      p."id",
      p."area_slug" AS "areaSlug",
      p."category",
      p."lat"::double precision AS "lat",
      p."lng"::double precision AS "lng",
      pt."name",
      pt."address",
      pt."summary",
      ST_Distance(
        p."location",
        ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography
      ) AS "distanceMeters"
    FROM "places" p
    INNER JOIN "place_translations" pt
      ON pt."place_id" = p."id" AND pt."locale" = ${query.locale}
    WHERE p."status" = 'ACTIVE'::"PlaceStatus"
      AND (${hideDemoPlaces} = FALSE OR p."id" NOT LIKE 'seed-place-%')
      AND p."location" IS NOT NULL
      AND (${query.category ?? null}::text IS NULL OR p."category" = ${query.category ?? null})
      AND ST_DWithin(
        p."location",
        ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography,
        ${query.radiusMeters}
      )
    ORDER BY "distanceMeters" ASC, p."id" ASC
    LIMIT ${query.take}
  `;
}

export async function selectMapPlaceRecords(
  query: MapPlacesQuery,
): Promise<NearbyPlaceRecord[]> {
  const database = getDatabase();
  return database.$queryRaw<NearbyPlaceRecord[]>`
    SELECT
      p."id",
      p."area_slug" AS "areaSlug",
      p."category",
      p."lat"::double precision AS "lat",
      p."lng"::double precision AS "lng",
      pt."name",
      pt."address",
      pt."summary",
      0::double precision AS "distanceMeters"
    FROM "places" p
    INNER JOIN "place_translations" pt
      ON pt."place_id" = p."id" AND pt."locale" = ${query.locale}
    WHERE p."status" = 'ACTIVE'::"PlaceStatus"
      AND (${hideDemoPlaces} = FALSE OR p."id" NOT LIKE 'seed-place-%')
      AND p."location" IS NOT NULL
      AND (${query.category ?? null}::text IS NULL OR p."category" = ${query.category ?? null})
      AND p."location" && ST_MakeEnvelope(${query.west}, ${query.south}, ${query.east}, ${query.north}, 4326)::geography
      AND ST_Covers(
        ST_MakeEnvelope(${query.west}, ${query.south}, ${query.east}, ${query.north}, 4326),
        p."location"::geometry
      )
    ORDER BY p."id" ASC
    LIMIT ${query.take + 1}
  `;
}

export type PlaceRecords = Awaited<ReturnType<typeof selectPlaceRecords>>;
