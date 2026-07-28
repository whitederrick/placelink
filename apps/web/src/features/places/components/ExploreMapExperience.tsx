"use client";

import dynamic from "next/dynamic";
import { MapPin, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { trackAnalyticsEvent } from "@/features/analytics/client";
import type { MapBounds, MapProvider } from "@/lib/adapters/maps";
import { useMapPlaces } from "../hooks";
import type { MapPlacesQuery, PlaceSummary } from "../schema";
import { FallbackMap } from "./FallbackMap";

const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false });
interface ExploreMapExperienceProps {
  locale: "ko" | "en";
  initialPlaces: PlaceSummary[];
  areaLabel: string;
  provider: MapProvider;
  apiKey?: string;
  resetHref: string;
  category?: MapPlacesQuery["category"];
}

export function ExploreMapExperience({
  locale,
  initialPlaces,
  areaLabel,
  provider,
  apiKey,
  resetHref,
  category,
}: ExploreMapExperienceProps) {
  const t = useTranslations("explore");
  const [pendingBounds, setPendingBounds] = useState<MapBounds | null>(null);
  const [mapQuery, setMapQuery] = useState<MapPlacesQuery | null>(null);
  const handleBoundsChanged = useCallback(
    (bounds: MapBounds) => setPendingBounds(bounds),
    [],
  );
  const mapResult = useMapPlaces(mapQuery);
  const places = mapResult.data?.data ?? initialPlaces;

  const searchCurrentArea = () => {
    if (!pendingBounds) return;
    setMapQuery({ locale, ...pendingBounds, category, take: 50 });
    trackAnalyticsEvent("map.area_searched", { locale, category });
  };

  return (
    <div className="explore-workspace">
      <div className="explore-map-column">
        <div className="map-preview interactive-map">
          {apiKey ? (
            <MapCanvas
              provider={provider}
              apiKey={apiKey}
              locale={locale}
              points={places}
              onBoundsChanged={handleBoundsChanged}
              errorLabel={t("mapSdkError")}
            />
          ) : (
            <FallbackMap places={places} />
          )}
          {apiKey && pendingBounds ? (
            <button
              className="map-refresh"
              type="button"
              onClick={searchCurrentArea}
              disabled={mapResult.isFetching}
            >
              <RefreshCw size={14} />
              {mapResult.isFetching ? t("searchingArea") : t("searchArea")}
            </button>
          ) : null}
          <div className="map-caption">
            <span>
              <MapPin size={15} />
              {areaLabel}
            </span>
            <strong>{t("placeCount", { count: places.length })}</strong>
          </div>
        </div>
        {mapResult.data?.meta.capped ? (
          <p className="map-limit-note">{t("mapResultCapped")}</p>
        ) : null}
      </div>
      <section className="nearby-panel">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{t("nearbyKicker")}</span>
            <h2>{t("resultsTitle", { area: areaLabel })}</h2>
          </div>
        </div>
        <div className="place-result-list">
          {places.length === 0 ? (
            <div className="empty-state">
              <strong>{t("emptyTitle")}</strong>
              <p>{t("emptyBody")}</p>
              <a className="button primary" href={resetHref}>
                {t("resetFilters")}
              </a>
            </div>
          ) : (
            places.map((place, index) => (
              <article className="mini-place-row" key={place.id}>
                <div
                  className={`mini-cover category-${place.category.toLowerCase()}`}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div>
                  <strong>{place.name}</strong>
                  <span>{place.summary ?? place.address}</span>
                  <small>
                    {t(`categories.${place.category}`)} ·{" "}
                    {place.area ? t(`areas.${place.area}`) : t("allSeoul")}
                  </small>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
