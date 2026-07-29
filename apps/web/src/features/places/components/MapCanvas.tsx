"use client";

import { useEffect, useRef, useState } from "react";
import {
  createMapAdapter,
  type MapBounds,
  type MapController,
  type MapPoint,
  type MapProvider,
} from "@/lib/adapters/maps";

interface MapCanvasProps {
  provider: MapProvider;
  apiKey: string;
  locale: "ko" | "en";
  points: MapPoint[];
  onBoundsChanged: (bounds: MapBounds) => void;
  onLoadError: () => void;
}

export default function MapCanvas({
  provider,
  apiKey,
  locale,
  points,
  onBoundsChanged,
  onLoadError,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<MapController | null>(null);
  const initialPointsRef = useRef(points);
  const [center] = useState(() => points[0] ?? { lat: 37.5665, lng: 126.978 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    createMapAdapter(provider, apiKey, locale)
      .mount({
        container,
        center: { lat: center.lat, lng: center.lng },
        points: initialPointsRef.current,
        onBoundsChanged,
      })
      .then((controller) => {
        if (disposed) controller.destroy();
        else controllerRef.current = controller;
      })
      .catch(onLoadError);
    return () => {
      disposed = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, [
    apiKey,
    center.lat,
    center.lng,
    locale,
    onBoundsChanged,
    onLoadError,
    provider,
  ]);

  useEffect(() => controllerRef.current?.updatePoints(points), [points]);

  return <div className="map-sdk-canvas" ref={containerRef} />;
}
