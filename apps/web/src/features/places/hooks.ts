"use client";

import { useQuery } from "@tanstack/react-query";
import { mapPlacesResponseSchema, type MapPlacesQuery, type NearbyPlacesQuery, type PlaceListQuery } from "./schema";

export const placeQueryKeys = {
  all: ["places"] as const,
  list: (query: PlaceListQuery) => [...placeQueryKeys.all, "list", query] as const,
  nearby: (query: NearbyPlacesQuery) => [...placeQueryKeys.all, "nearby", query] as const
  ,map: (query: MapPlacesQuery) => [...placeQueryKeys.all, "map", query] as const
};

export function useMapPlaces(query: MapPlacesQuery | null) {
  return useQuery({
    queryKey: query ? placeQueryKeys.map(query) : [...placeQueryKeys.all, "map", "idle"],
    enabled: query !== null,
    queryFn: async () => {
      if (!query) throw new Error("Map bounds are required");
      const params = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]));
      const response = await fetch(`/api/v1/places/map?${params.toString()}`);
      if (!response.ok) throw new Error("Map places request failed");
      return mapPlacesResponseSchema.parse(await response.json());
    },
    staleTime: 30_000
  });
}
