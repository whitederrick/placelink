export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface MapMountOptions {
  container: HTMLElement;
  center: { lat: number; lng: number };
  points: MapPoint[];
  onBoundsChanged: (bounds: MapBounds) => void;
}

export interface MapController {
  updatePoints(points: MapPoint[]): void;
  destroy(): void;
}

export interface MapAdapter {
  mount(options: MapMountOptions): Promise<MapController>;
}

export type MapProvider = "kakao" | "google";
