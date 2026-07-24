import { Search, SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { PlaceListQuery, PlaceSummary } from "../schema";
import type { MapProvider } from "@/lib/adapters/maps";
import { ExploreMapExperience } from "./ExploreMapExperience";

const AREAS = ["seongsu", "yeonnam", "seochon", "hannam", "mangwon"] as const;
interface ExploreScreenProps {
  locale: "ko" | "en";
  places: PlaceSummary[];
  filters: Pick<PlaceListQuery, "area" | "query">;
  mapConfig: { provider: MapProvider; apiKey?: string };
}

function exploreHref(locale: string, area?: string, query?: string) {
  const params = new URLSearchParams();
  if (area) params.set("area", area);
  if (query) params.set("query", query);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return `/${locale}/explore${suffix}`;
}

export async function ExploreScreen({ locale, places, filters, mapConfig }: ExploreScreenProps) {
  const t = await getTranslations("explore");
  const selectedArea = filters.area;
  const areaLabel = selectedArea ? t(`areas.${selectedArea}`) : t("allSeoul");

  return (
    <div className="screen-page explore-page">
      <div className="page-intro">
        <span className="section-kicker">{t("kicker")}</span>
        <h1>{t.rich("title", { br: () => <br /> })}</h1>
        <p>{t("subtitle")}</p>
      </div>
      <form className="search-shell" action={`/${locale}/explore`} method="get">
        <Search size={20} />
        <input name="query" defaultValue={filters.query} placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")} />
        {selectedArea ? <input type="hidden" name="area" value={selectedArea} /> : null}
        <button type="submit" aria-label={t("searchSubmit")}><SlidersHorizontal size={18} /></button>
      </form>
      <nav className="chip-row" aria-label={t("areaFilterLabel")}>
        <Link className={!selectedArea ? "selected" : ""} href={exploreHref(locale, undefined, filters.query)}>{t("all")}</Link>
        {AREAS.map((area) => (
          <Link className={selectedArea === area ? "selected" : ""} href={exploreHref(locale, area, filters.query)} key={area}>
            {t(`areas.${area}`)}
          </Link>
        ))}
      </nav>
      <ExploreMapExperience
        locale={locale}
        initialPlaces={places}
        areaLabel={areaLabel}
        provider={mapConfig.provider}
        apiKey={mapConfig.apiKey}
        resetHref={`/${locale}/explore`}
      />
    </div>
  );
}
