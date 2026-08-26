import type { Locale } from "@/i18n/config";

interface MapPlace {
  name: string;
  lat: number;
  lng: number;
}

export function createPlaceMapUrl(locale: Locale, place: MapPlace) {
  if (locale === "ko") {
    return `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`;
  }
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", `${place.lat},${place.lng}`);
  return url.toString();
}
