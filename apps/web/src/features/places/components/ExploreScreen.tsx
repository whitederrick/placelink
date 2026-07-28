import { Search, SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AnalyticsEventOnMount } from "@/features/analytics/components/AnalyticsEventOnMount";
import type { PlaceListQuery, PlaceSummary } from "../schema";
import type { MapProvider } from "@/lib/adapters/maps";
import { ExploreMapExperience } from "./ExploreMapExperience";

const AREAS = ["seongsu", "yeonnam", "seochon", "hannam", "mangwon"] as const;
const CATEGORIES = [
  "EXHIBITION",
  "CAFE",
  "SHOP",
  "RESTAURANT",
  "ACTIVITY",
  "BAR",
] as const;
interface ExploreScreenProps {
  locale: "ko" | "en";
  places: PlaceSummary[];
  filters: Pick<PlaceListQuery, "area" | "query" | "category">;
  mapConfig: { provider: MapProvider; apiKey?: string };
}

function exploreHref(
  locale: string,
  filters: Pick<PlaceListQuery, "area" | "query" | "category">,
  change: Partial<Pick<PlaceListQuery, "area" | "query" | "category">>,
) {
  const next = { ...filters, ...change };
  const params = new URLSearchParams();
  if (next.area) params.set("area", next.area);
  if (next.query) params.set("query", next.query);
  if (next.category) params.set("category", next.category);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return `/${locale}/explore${suffix}`;
}

export async function ExploreScreen({
  locale,
  places,
  filters,
  mapConfig,
}: ExploreScreenProps) {
  const t = await getTranslations("explore");
  const selectedArea = filters.area;
  const areaLabel = selectedArea ? t(`areas.${selectedArea}`) : t("allSeoul");

  return (
    <div className="screen-page explore-page">
      {filters.category ? (
        <AnalyticsEventOnMount
          event={{
            name: "filter.used",
            properties: {
              surface: "explore",
              filter: "category",
              value: filters.category,
            },
          }}
        />
      ) : filters.area ? (
        <AnalyticsEventOnMount
          event={{
            name: "filter.used",
            properties: {
              surface: "explore",
              filter: "area",
              value: filters.area,
            },
          }}
        />
      ) : filters.query ? (
        <AnalyticsEventOnMount
          event={{
            name: "filter.used",
            properties: {
              surface: "explore",
              filter: "query",
              value: filters.query,
            },
          }}
        />
      ) : null}
      <div className="page-intro">
        <span className="section-kicker">{t("kicker")}</span>
        <h1>{t.rich("title", { br: () => <br /> })}</h1>
        <p>{t("subtitle")}</p>
      </div>
      <form className="search-shell" action={`/${locale}/explore`} method="get">
        <Search size={20} />
        <input
          name="query"
          defaultValue={filters.query}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />
        {selectedArea ? (
          <input type="hidden" name="area" value={selectedArea} />
        ) : null}
        {filters.category ? (
          <input type="hidden" name="category" value={filters.category} />
        ) : null}
        <button type="submit" aria-label={t("searchSubmit")}>
          <SlidersHorizontal size={18} />
        </button>
      </form>
      <nav className="chip-row" aria-label={t("areaFilterLabel")}>
        <Link
          className={!selectedArea ? "selected" : ""}
          href={exploreHref(locale, filters, { area: undefined })}
        >
          {t("all")}
        </Link>
        {AREAS.map((area) => (
          <Link
            className={selectedArea === area ? "selected" : ""}
            href={exploreHref(locale, filters, { area })}
            key={area}
          >
            {t(`areas.${area}`)}
          </Link>
        ))}
      </nav>
      <nav className="chip-row" aria-label={t("categoryFilterLabel")}>
        <Link
          className={!filters.category ? "selected" : ""}
          href={exploreHref(locale, filters, { category: undefined })}
        >
          {t("all")}
        </Link>
        {CATEGORIES.map((category) => (
          <Link
            className={filters.category === category ? "selected" : ""}
            href={exploreHref(locale, filters, { category })}
            key={category}
          >
            {t(`categories.${category}`)}
          </Link>
        ))}
      </nav>
      <ExploreMapExperience
        locale={locale}
        initialPlaces={places}
        areaLabel={areaLabel}
        provider={mapConfig.provider}
        apiKey={mapConfig.apiKey}
        category={filters.category}
        resetHref={`/${locale}/explore`}
      />
    </div>
  );
}
