"use client";

import { useEffect, useState } from "react";
import type { WeatherSnapshot } from "@/lib/adapters/weather";

export function DeferredWeather({
  labels,
}: Readonly<{
  labels: { rain: string; snow: string; temperature: string; source: string };
}>) {
  const [weather, setWeather] = useState<WeatherSnapshot>();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch("/api/v1/weather")
        .then((response) => (response.ok ? response.json() : null))
        .then((body: { data?: WeatherSnapshot | null } | null) => {
          if (body?.data) setWeather(body.data);
        })
        .catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);
  if (!weather) return null;
  const label = weather.precipitation === "rain" ? labels.rain : weather.precipitation === "snow" ? labels.snow : labels.temperature;
  return <><span className="weather-live">{label.replace("{temperature}", String(Math.round(weather.temperatureC)))}</span><a className="weather-attribution" href="https://www.data.go.kr/data/15084084/openapi.do" rel="noreferrer" target="_blank">{labels.source}</a></>;
}
