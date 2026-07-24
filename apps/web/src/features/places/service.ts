import {
  nearbyPlacesResponseSchema,
  mapPlacesResponseSchema,
  placeListResponseSchema,
  type MapPlacesQuery,
  type NearbyPlacesQuery,
  type PlaceListQuery,
  type PlaceSummary,
} from "./schema";
import {
  selectMapPlaceRecords,
  selectNearbyPlaceRecords,
  selectPlaceRecords,
  type PlaceRecords,
} from "./queries";

function mapPlace(record: PlaceRecords[number]): PlaceSummary {
  const translation = record.translations[0];
  return {
    id: record.id,
    name: translation?.name ?? record.id,
    address: translation?.address ?? "",
    summary: translation?.summary,
    area: record.areaSlug as PlaceSummary["area"],
    category: record.category as PlaceSummary["category"],
    lat: Number(record.lat),
    lng: Number(record.lng),
  };
}

export async function searchPlaces(query: PlaceListQuery) {
  const records = await selectPlaceRecords(query);
  const hasNextPage = records.length > query.take;
  const visible = records.slice(0, query.take).map(mapPlace);
  return placeListResponseSchema.parse({
    data: visible,
    meta: { nextCursor: hasNextPage ? visible.at(-1)?.id : undefined },
  });
}

export async function findNearbyPlaces(query: NearbyPlacesQuery) {
  const records = await selectNearbyPlaceRecords(query);
  return nearbyPlacesResponseSchema.parse({
    data: records.map((record) => ({
      ...record,
      area: record.areaSlug,
      distanceMeters: Math.round(Number(record.distanceMeters)),
    })),
    meta: { radiusMeters: query.radiusMeters },
  });
}

export async function findMapPlaces(query: MapPlacesQuery) {
  const records = await selectMapPlaceRecords(query);
  return mapPlacesResponseSchema.parse({
    data: records.slice(0, query.take).map((record) => ({
      ...record,
      area: record.areaSlug,
    })),
    meta: { capped: records.length > query.take },
  });
}
