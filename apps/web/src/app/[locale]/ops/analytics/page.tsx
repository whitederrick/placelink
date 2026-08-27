import { Activity, Filter, Gauge, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadAnalyticsSummary } from "@/features/analytics";
import { loadHumanActor } from "@/features/auth";
import { isLocale } from "@/i18n/config";

function formatTimestamp(value: string | null, locale: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export default async function AnalyticsOperationsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ days?: string }>;
}>) {
  const [{ locale }, query, session] = await Promise.all([
    params,
    searchParams,
    auth(),
  ]);
  if (!isLocale(locale)) notFound();
  const actor = session?.user?.id
    ? await loadHumanActor(session.user.id)
    : null;
  if (actor?.role !== "ADMIN") notFound();

  const days = Number(query.days) === 30 ? 30 : 7;
  const [summary, t] = await Promise.all([
    loadAnalyticsSummary(days),
    getTranslations("analytics"),
  ]);
  const statusLabel =
    summary.monitoring.status === "healthy"
      ? t("status.healthy")
      : summary.monitoring.status === "stale"
        ? t("status.stale")
        : t("status.idle");

  return (
    <div className="screen-page analytics-dashboard">
      <header className="analytics-heading">
        <span className="section-kicker">{t("kicker")}</span>
        <h1>{t("title")}</h1>
        <p>{t("subtitle", { days })}</p>
        <div className="ingestion-nav">
          <Link href={`/${locale}/studio/ingestions`}>{t("viewIngestions")}</Link>
          <Link href={`/${locale}/studio/happenings`}>{t("viewCuration")}</Link>
        </div>
        <nav className="chip-row" aria-label={t("rangeLabel")}>
          <Link className={days === 7 ? "selected" : ""} href="?days=7">
            {t("days", { days: 7 })}
          </Link>
          <Link className={days === 30 ? "selected" : ""} href="?days=30">
            {t("days", { days: 30 })}
          </Link>
        </nav>
      </header>

      <section className="analytics-status-card">
        <Gauge size={20} />
        <div>
          <strong>{statusLabel}</strong>
          <span>
            {t("lastEvent")}:{" "}
            {formatTimestamp(summary.monitoring.lastEventAt, locale)}
          </span>
        </div>
      </section>

      <section className="analytics-metric-grid">
        <article>
          <Activity size={18} />
          <span>{t("totalEvents")}</span>
          <strong>{summary.totals.current.toLocaleString(locale)}</strong>
          <small>
            {summary.totals.changePercent === null
              ? t("newActivity")
              : t("change", { value: summary.totals.changePercent })}
          </small>
        </article>
        <article>
          <Filter size={18} />
          <span>{t("filterEvents")}</span>
          <strong>{summary.filters.count.toLocaleString(locale)}</strong>
          <small>{formatTimestamp(summary.filters.lastUsedAt, locale)}</small>
        </article>
        <article>
          <UserRound size={18} />
          <span>{t("authenticatedEvents")}</span>
          <strong>{summary.totals.authenticated.toLocaleString(locale)}</strong>
          <small>{t("privacyNote")}</small>
        </article>
      </section>

      <section className="analytics-panel">
        <h2>{t("eventBreakdown")}</h2>
        {summary.events.length ? (
          <div className="analytics-list">
            {summary.events.map((event) => (
              <div key={event.name}>
                <code>{event.name}</code>
                <strong>{event.count.toLocaleString(locale)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p>{t("empty")}</p>
        )}
      </section>

      <section className="analytics-panel">
        <h2>{t("latestEvents")}</h2>
        {summary.latest.length ? (
          <div className="analytics-list">
            {summary.latest.map((event) => (
              <div key={event.id}>
                <span>
                  <code>{event.name}</code>
                  <small>{formatTimestamp(event.createdAt, locale)}</small>
                </span>
                <strong>
                  {event.authenticated ? t("authenticated") : t("anonymous")}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p>{t("empty")}</p>
        )}
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
