import { createGoogleMapAdapter } from "./google";
import { createKakaoMapAdapter } from "./kakao";
import type { MapAdapter, MapProvider } from "./types";

export { createPlaceMapUrl } from "./deep-links";

export type { MapBounds, MapController, MapPoint, MapProvider } from "./types";

export function createMapAdapter(provider: MapProvider, apiKey: string, locale: "ko" | "en"): MapAdapter {
  return provider === "kakao" ? createKakaoMapAdapter(apiKey) : createGoogleMapAdapter(apiKey, locale);
}
