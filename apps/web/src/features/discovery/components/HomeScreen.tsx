import {
  ArrowUpRight,
  Bookmark,
  Clock3,
  Crown,
  Eye,
  MapPin,
  MoveRight,
  Sparkles,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AnalyticsEventOnMount } from "@/features/analytics/components/AnalyticsEventOnMount";
import type { Locale } from "@/i18n/config";
import type { HomeFeed, HomeFeedQuery } from "../schema";

type ActiveFilters = Pick<
  HomeFeedQuery,
  "sort" | "area" | "situation" | "budget" | "mood"
>;

function homeHref(
  locale: Locale,
  filters: Partial<ActiveFilters>,
  change: Partial<ActiveFilters>,
) {
  const next = { ...filters, ...change };
  const params = new URLSearchParams();
  if (next.sort && next.sort !== "latest") params.set("sort", next.sort);
  for (const key of ["area", "situation", "budget", "mood"] as const) {
    if (next[key]) params.set(key, next[key]);
  }
  const suffix = params.size ? `?${params.toString()}` : "";
  return `/${locale}${suffix}`;
}

export async function HomeScreen({
  feed,
  locale,
  activeFilters,
}: Readonly<{
  feed: HomeFeed;
  locale: Locale;
  activeFilters: ActiveFilters;
}>) {
  const t = await getTranslations("home");
  const trackedFilter = (Object.entries(activeFilters).find(([key, value]) =>
    key !== "sort" ? Boolean(value) : value === "popular",
  ) ?? []) as [keyof ActiveFilters | undefined, string | undefined];

  return (
    <div className="home-screen">
      {trackedFilter[0] && trackedFilter[1] ? (
        <AnalyticsEventOnMount
          event={{
            name: "filter.used",
            properties: {
              surface: "home",
              filter: trackedFilter[0],
              value: trackedFilter[1],
            },
          }}
        />
      ) : null}
      <section className="hero-section">
        <div className="eyebrow">
          <span className="live-dot" />
          {t("eyebrow")}
        </div>
        <h1>
          {t.rich("headline", {
            accent: (chunks) => <em>{chunks}</em>,
            br: () => <br />,
          })}
        </h1>
        <p>{t("subhead")}</p>
        <div className="hero-actions">
          <Link className="button primary" href={`/${locale}/explore`}>
            {t("exploreCta")}
            <MoveRight size={18} />
          </Link>
          <Link className="button ghost" href={`/${locale}/create`}>
            {t("createCta")}
          </Link>
        </div>
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <span className="hero-sticker">
          SEOUL
          <br />
          37.5665°N
        </span>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{t("anchorKicker")}</span>
            <h2>{t("anchorTitle")}</h2>
          </div>
          <Link href={`/${locale}/explore`}>
            {t("viewAll")}
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="anchor-scroll">
          {feed.happenings.length === 0 ? (
            <div className="empty-state compact">
              <strong>{t("emptyAnchorsTitle")}</strong>
              <p>{t("emptyAnchorsBody")}</p>
            </div>
          ) : (
            feed.happenings.map((happening, index) => (
              <Link
                className={`anchor-card ${happening.tone}`}
                href={`/${locale}/create?anchor=${happening.id}`}
                key={happening.id}
              >
                <div className="anchor-visual">
                  <span className="anchor-index">0{index + 1}</span>
                  <Sparkles size={34} />
                </div>
                <div className="anchor-copy">
                  <div className="anchor-meta">
                    <span>
                      <MapPin size={13} />
                      {happening.neighborhood}
                    </span>
                    <strong>{happening.dDay}</strong>
                  </div>
                  <h3>{happening.title}</h3>
                  <p>{happening.period}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {feed.hallOfFame.length ? (
        <section className="content-section hall-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{t("hallKicker")}</span>
              <h2>{t("hallTitle")}</h2>
            </div>
          </div>
          <div className="hall-grid">
            {feed.hallOfFame.map((course) => (
              <Link
                className="hall-card"
                href={`/${locale}/courses/${course.slug}`}
                key={course.slug}
              >
                <span className="hall-rank">
                  <Crown size={15} />#{course.rank}
                </span>
                <strong>
                  {course.neighborhood} · {course.coupleName}
                </strong>
                <small>
                  <Bookmark size={13} />
                  {course.scraps}
                  <Eye size={13} />
                  {course.views}
                </small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="content-section feed-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{t("feedKicker")}</span>
            <h2>{t("feedTitle")}</h2>
          </div>
          <span className="pulse-label">
            <span />
            {t("live")}
          </span>
        </div>
        <div className="feed-filters">
          <div className="chip-row">
            <Link
              className={activeFilters.sort === "latest" ? "selected" : ""}
              href={homeHref(locale, activeFilters, { sort: "latest" })}
            >
              {t("sortLatest")}
            </Link>
            <Link
              className={activeFilters.sort === "popular" ? "selected" : ""}
              href={homeHref(locale, activeFilters, { sort: "popular" })}
            >
              {t("sortPopular")}
            </Link>
          </div>
          {(
            [
              ["situation", feed.filters.situations, t("situationFilter")],
              ["budget", feed.filters.budgets, t("budgetFilter")],
              ["mood", feed.filters.moods, t("moodFilter")],
            ] as const
          ).map(([key, options, label]) =>
            options.length ? (
              <div className="filter-line" key={key}>
                <strong>{label}</strong>
                <div className="chip-row">
                  <Link
                    className={!activeFilters[key] ? "selected" : ""}
                    href={homeHref(locale, activeFilters, { [key]: undefined })}
                  >
                    {t("all")}
                  </Link>
                  {options.map((option) => (
                    <Link
                      className={
                        activeFilters[key] === option.slug ? "selected" : ""
                      }
                      href={homeHref(locale, activeFilters, {
                        [key]: option.slug,
                      })}
                      key={option.slug}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
        <div className="course-grid">
          {feed.courses.length === 0 ? (
            <div className="empty-state">
              <strong>{t("emptyCoursesTitle")}</strong>
              <p>{t("emptyCoursesBody")}</p>
              <Link className="button primary" href={`/${locale}/create`}>
                {t("createCta")}
              </Link>
            </div>
          ) : (
            feed.courses.map((course, index) => (
              <Link
                className="course-card"
                href={`/${locale}/courses/${course.slug}`}
                key={course.slug}
              >
                <div className={`course-cover ${course.tone}`}>
                  <span className="cover-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="cover-place">{course.neighborhood}</span>
                  <span className="bookmark-button" aria-hidden="true">
                    <Bookmark size={18} />
                  </span>
                  <div className="cover-route">
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <div className="course-copy">
                  <div className="course-owner">
                    <span>{course.coupleName}</span>
                    <small>{t("courseSuffix")}</small>
                  </div>
                  <div className="course-stats">
                    <span>
                      <Clock3 size={14} />
                      {course.duration}
                    </span>
                    <span>{t("stops", { count: course.stops })}</span>
                    <span>{t("scraps", { count: course.scraps })}</span>
                    <span>
                      <Eye size={14} />
                      {course.views}
                    </span>
                  </div>
                  <div className="tag-row">
                    {course.tags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
