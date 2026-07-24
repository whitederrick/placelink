import { loadMapScript } from "./script-loader";
import type { MapAdapter, MapBounds, MapController, MapMountOptions, MapPoint } from "./types";

interface KakaoLatLng { getLat(): number; getLng(): number }
interface KakaoBounds { getSouthWest(): KakaoLatLng; getNorthEast(): KakaoLatLng }
interface KakaoMap { getBounds(): KakaoBounds }
interface KakaoMarker { setMap(map: KakaoMap | null): void }
interface KakaoMaps {
  load(callback: () => void): void;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Marker: new (options: { map: KakaoMap; position: KakaoLatLng; title: string }) => KakaoMarker;
  event: {
    addListener(target: KakaoMap, event: "idle", callback: () => void): void;
    removeListener(target: KakaoMap, event: "idle", callback: () => void): void;
  };
}
interface KakaoGlobal { maps: KakaoMaps }
type KakaoWindow = Window & { kakao?: KakaoGlobal };

function readBounds(map: KakaoMap): MapBounds {
  const bounds = map.getBounds();
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  return { south: southWest.getLat(), west: southWest.getLng(), north: northEast.getLat(), east: northEast.getLng() };
}

export function createKakaoMapAdapter(apiKey: string): MapAdapter {
  return {
    async mount({ container, center, points, onBoundsChanged }: MapMountOptions): Promise<MapController> {
      const kakaoWindow = window as KakaoWindow;
      await loadMapScript(
        "placelink-kakao-map-sdk",
        `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(apiKey)}&autoload=false`,
        () => Boolean(kakaoWindow.kakao?.maps)
      );
      const kakao = kakaoWindow.kakao;
      if (!kakao) throw new Error("Kakao Maps is unavailable");
      await new Promise<void>((resolve) => kakao.maps.load(resolve));

      const map = new kakao.maps.Map(container, { center: new kakao.maps.LatLng(center.lat, center.lng), level: 5 });
      let markers: KakaoMarker[] = [];
      const updatePoints = (nextPoints: MapPoint[]) => {
        markers.forEach((marker) => marker.setMap(null));
        markers = nextPoints.map((point) => new kakao.maps.Marker({
          map,
          position: new kakao.maps.LatLng(point.lat, point.lng),
          title: point.name
        }));
      };
      const handleIdle = () => onBoundsChanged(readBounds(map));
      updatePoints(points);
      kakao.maps.event.addListener(map, "idle", handleIdle);
      handleIdle();

      return {
        updatePoints,
        destroy() {
          markers.forEach((marker) => marker.setMap(null));
          kakao.maps.event.removeListener(map, "idle", handleIdle);
        }
      };
    }
  };
}
