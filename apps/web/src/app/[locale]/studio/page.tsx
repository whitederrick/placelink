import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { loadStudioDashboard } from "@/features/studio-operations";
import { isLocale } from "@/i18n/config";
import { webEnv } from "@/lib/env";

export default async function StudioPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const [{ locale }, session, t, dashboardT] = await Promise.all([
    params,
    auth(),
    getTranslations("studioAccess"),
    getTranslations("studioDashboard"),
  ]);
  if (!isLocale(locale)) notFound();

  const actor = session?.user?.id
    ? await loadHumanActor(session.user.id)
    : null;
  if (actor?.role === "ADMIN") {
    const { data } = await loadStudioDashboard(actor);
    const metrics = [
      ["activeUsers", data.metrics.activeUsers],
      ["newUsers7d", data.metrics.newUsers7d],
      ["recentActivity15m", data.metrics.recentActivity15m],
      ["publishedCourses", data.metrics.publishedCourses],
      ["liveHappenings", data.metrics.liveHappenings],
      ["pendingIngestions", data.metrics.pendingIngestions],
      ["failedRuns24h", data.metrics.failedRuns24h],
    ] as const;
    const dateTime = (value: string | null) =>
      value
        ? new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Seoul",
          }).format(new Date(value))
        : dashboardT("never");

    return (
      <div className="studio-dashboard-page">
        <header className="studio-page-heading">
          <div>
            <span className="section-kicker">{dashboardT("kicker")}</span>
            <h1>{dashboardT("title")}</h1>
            <p>{dashboardT("subtitle")}</p>
          </div>
          <Link className="button primary" href={`/${locale}/studio/runs`}>
            {dashboardT("viewRuns")}
          </Link>
        </header>

        <section className="studio-metric-grid" aria-label={dashboardT("metricsLabel")}>
          {metrics.map(([key, value]) => (
            <article key={key}>
              <span>{dashboardT(`metrics.${key}`)}</span>
              <strong>{value.toLocaleString(locale)}</strong>
            </article>
          ))}
        </section>

        <section className="studio-dashboard-grid">
          <article className="studio-panel">
            <div className="studio-panel-heading">
              <div>
                <h2>{dashboardT("providerHealth")}</h2>
                <p>{dashboardT("providerHealthBody")}</p>
              </div>
            </div>
            <div className="studio-provider-list">
              {data.providers.map((provider) => (
                <Link
                  href={`/${locale}/studio/runs?provider=${provider.provider}`}
                  key={provider.provider}
                >
                  <span>
                    <strong>{dashboardT(`providers.${provider.provider}`)}</strong>
                    <small>{dateTime(provider.finishedAt ?? provider.startedAt)}</small>
                  </span>
                  <span className={`studio-status is-${provider.status?.toLowerCase() ?? "idle"}`}>
                    {dashboardT(`status.${provider.status?.toLowerCase() ?? "idle"}`)}
                  </span>
                </Link>
              ))}
            </div>
          </article>

          <article className="studio-panel">
            <div className="studio-panel-heading">
              <div>
                <h2>{dashboardT("recentRuns")}</h2>
                <p>{dashboardT("recentRunsBody")}</p>
              </div>
            </div>
            <div className="studio-run-list compact">
              {data.recentRuns.length ? (
                data.recentRuns.map((run) => (
                  <Link href={`/${locale}/studio/runs/${run.id}`} key={run.id}>
                    <span>
                      <strong>{dashboardT(`providers.${run.provider}`)}</strong>
                      <small>{dateTime(run.startedAt)}</small>
                    </span>
                    <span>
                      <strong>{dashboardT("inserted", { count: run.inserted })}</strong>
                      <small>{dashboardT(`status.${run.status.toLowerCase()}`)}</small>
                    </span>
                  </Link>
                ))
              ) : (
                <p className="studio-empty">{dashboardT("noRuns")}</p>
              )}
            </div>
          </article>
        </section>

        <section className="studio-panel">
          <div className="studio-panel-heading">
            <div>
              <h2>{dashboardT("operatingAreas")}</h2>
              <p>{dashboardT("operatingAreasBody")}</p>
            </div>
          </div>
          <div className="studio-area-grid">
            {(["customers", "content", "partners", "campaigns", "revenue"] as const).map(
              (area) => (
                <article key={area}>
                  <strong>{dashboardT(`areas.${area}.title`)}</strong>
                  <p>{dashboardT(`areas.${area}.body`)}</p>
                  <small>{dashboardT(`areas.${area}.status`)}</small>
                </article>
              ),
            )}
          </div>
        </section>
      </div>
    );
  }

  const callbackUrl = `/${locale}/studio`;
  const signInHref = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const configured = webEnv.STUDIO_OPERATOR_EMAILS.length > 0;

  return (
    <div className="screen-page studio-access-page">
      <section className="studio-access-card">
        <span className="section-kicker">{t("kicker")}</span>
        <h1>{t("title")}</h1>
        <p>
          {session?.user
            ? t("forbidden")
            : configured
              ? t("body")
              : t("unavailable")}
        </p>
        {!session?.user && configured ? (
          <Link className="button primary" href={signInHref}>
            {t("signIn")}
          </Link>
        ) : null}
        <Link className="button ghost" href={`/${locale}`}>
          {t("backHome")}
        </Link>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
