import { loadMapScript } from "./script-loader";
import type { MapAdapter, MapBounds, MapController, MapMountOptions, MapPoint } from "./types";

interface GoogleLatLng { lat(): number; lng(): number }
interface GoogleBounds { getSouthWest(): GoogleLatLng; getNorthEast(): GoogleLatLng }
interface GoogleListener { remove(): void }
interface GoogleDataFeature { readonly featureId?: string }
interface GoogleData {
  addGeoJson(data: object): GoogleDataFeature[];
  forEach(callback: (feature: GoogleDataFeature) => void): void;
  remove(feature: GoogleDataFeature): void;
  setStyle(style: object): void;
}
interface GoogleMap {
  data: GoogleData;
  getBounds(): GoogleBounds | undefined;
  addListener(event: "bounds_changed", callback: () => void): GoogleListener;
}
interface GoogleMaps {
  Map: new (container: HTMLElement, options: object) => GoogleMap;
}
interface GoogleGlobal { maps: GoogleMaps }
type GoogleWindow = Window & { google?: GoogleGlobal };

function readBounds(map: GoogleMap): MapBounds | null {
  const bounds = map.getBounds();
  if (!bounds) return null;
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  return { south: southWest.lat(), west: southWest.lng(), north: northEast.lat(), east: northEast.lng() };
}

export function createGoogleMapAdapter(apiKey: string, locale: "ko" | "en"): MapAdapter {
  return {
    async mount({ container, center, points, onBoundsChanged }: MapMountOptions): Promise<MapController> {
      const googleWindow = window as GoogleWindow;
      await loadMapScript(
        "placelink-google-map-sdk",
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=weekly&language=${locale}&region=KR`,
        () => Boolean(googleWindow.google?.maps)
      );
      const google = googleWindow.google;
      if (!google) throw new Error("Google Maps is unavailable");
      const map = new google.maps.Map(container, {
        center,
        zoom: 14,
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: "greedy"
      });
      map.data.setStyle({ icon: { path: "M 0 0 m -7,0 a 7,7 0 1,0 14,0 a 7,7 0 1,0 -14,0", fillColor: "#ff5c9d", fillOpacity: 1, strokeColor: "#11120f", strokeWeight: 2, scale: 1.15 } });

      const updatePoints = (nextPoints: MapPoint[]) => {
        map.data.forEach((feature) => map.data.remove(feature));
        map.data.addGeoJson({
          type: "FeatureCollection",
          features: nextPoints.map((point) => ({
            type: "Feature",
            properties: { id: point.id, name: point.name },
            geometry: { type: "Point", coordinates: [point.lng, point.lat] }
          }))
        });
      };
      const handleBoundsChanged = () => {
        const bounds = readBounds(map);
        if (bounds) onBoundsChanged(bounds);
      };
      updatePoints(points);
      const listener = map.addListener("bounds_changed", handleBoundsChanged);
      handleBoundsChanged();
      return { updatePoints, destroy: () => listener.remove() };
    }
  };
}
