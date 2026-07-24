"use client";

import dynamic from "next/dynamic";
import { MapPin, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { MapBounds, MapProvider } from "@/lib/adapters/maps";
import { useMapPlaces } from "../hooks";
import type { MapPlacesQuery, PlaceSummary } from "../schema";
import { FallbackMap } from "./FallbackMap";

const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false });
const TONES = ["lime", "pink"] as const;

interface ExploreMapExperienceProps {
  locale: "ko" | "en";
  initialPlaces: PlaceSummary[];
  areaLabel: string;
  provider: MapProvider;
  apiKey?: string;
  resetHref: string;
}

export function ExploreMapExperience({ locale, initialPlaces, areaLabel, provider, apiKey, resetHref }: ExploreMapExperienceProps) {
  const t = useTranslations("explore");
  const [pendingBounds, setPendingBounds] = useState<MapBounds | null>(null);
  const [mapQuery, setMapQuery] = useState<MapPlacesQuery | null>(null);
  const handleBoundsChanged = useCallback((bounds: MapBounds) => setPendingBounds(bounds), []);
  const mapResult = useMapPlaces(mapQuery);
  const places = mapResult.data?.data ?? initialPlaces;

  const searchCurrentArea = () => {
    if (!pendingBounds) return;
    setMapQuery({ locale, ...pendingBounds, take: 50 });
  };

  return <>
    <div className="map-preview interactive-map">
      {apiKey ? <MapCanvas provider={provider} apiKey={apiKey} locale={locale} points={places} onBoundsChanged={handleBoundsChanged} errorLabel={t("mapSdkError")} /> : <FallbackMap places={places} />}
      {apiKey && pendingBounds ? <button className="map-refresh" type="button" onClick={searchCurrentArea} disabled={mapResult.isFetching}><RefreshCw size={14} />{mapResult.isFetching ? t("searchingArea") : t("searchArea")}</button> : null}
      <div className="map-caption"><span><MapPin size={15} />{areaLabel}</span><strong>{t("placeCount", { count: places.length })}</strong></div>
    </div>
    {mapResult.data?.meta.capped ? <p className="map-limit-note">{t("mapResultCapped")}</p> : null}
    <section className="nearby-panel">
      <div className="section-heading"><div><span className="section-kicker">{t("nearbyKicker")}</span><h2>{t("resultsTitle", { area: areaLabel })}</h2></div></div>
      {places.length === 0 ? (
        <div className="empty-state"><strong>{t("emptyTitle")}</strong><p>{t("emptyBody")}</p><a className="button primary" href={resetHref}>{t("resetFilters")}</a></div>
      ) : places.map((place, index) => (
        <article className="mini-place-row" key={place.id}>
          <div className={`mini-cover ${TONES[index % TONES.length]}`} />
          <div><strong>{place.name}</strong><span>{t(`categories.${place.category}`)} · {place.address}</span><small>{place.area ? t(`areas.${place.area}`) : t("allSeoul")}</small></div>
          <b>{String(index + 1).padStart(2, "0")}</b>
        </article>
      ))}
    </section>
  </>;
}
