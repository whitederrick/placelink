import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import {
  INGESTION_RUN_STATUSES,
  STUDIO_INGESTION_PROVIDERS,
  listIngestionRuns,
} from "@/features/studio-operations";
import { isLocale } from "@/i18n/config";

function filterHref(current: URLSearchParams, key: string, value?: string) {
  const next = new URLSearchParams(current);
  if (value) next.set(key, value);
  else next.delete(key);
  next.delete("cursor");
  return next.size ? `?${next.toString()}` : "?";
}

function cursorHref(current: URLSearchParams, cursor: string) {
  const next = new URLSearchParams(current);
  next.set("cursor", cursor);
  return `?${next.toString()}`;
}

export default async function IngestionRunsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [{ locale }, rawQuery, session, t] = await Promise.all([
    params,
    searchParams,
    auth(),
    getTranslations("ingestionRuns"),
  ]);
  if (!isLocale(locale)) notFound();
  const actor = session?.user?.id ? await loadHumanActor(session.user.id) : null;
  if (actor?.role !== "ADMIN") notFound();
  const value = (key: string) =>
    typeof rawQuery[key] === "string" ? rawQuery[key] : undefined;
  const provider = STUDIO_INGESTION_PROVIDERS.find(
    (item) => item === value("provider"),
  );
  const status = INGESTION_RUN_STATUSES.find((item) => item === value("status"));
  const current = new URLSearchParams();
  if (provider) current.set("provider", provider);
  if (status) current.set("status", status);
  const { data, meta } = await listIngestionRuns(actor, {
    provider,
    status,
    cursor: value("cursor"),
  });
  const dateTime = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Seoul",
    }).format(new Date(value));
  const duration = (value: number | null) =>
    value === null ? t("running") : t("seconds", { count: Math.ceil(value / 1_000) });

  return (
    <div className="studio-list-page">
      <header className="studio-page-heading">
        <div>
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
        <Link className="button ghost" href={`/${locale}/studio/ingestions`}>
          {t("viewQueue")}
        </Link>
      </header>
      <nav className="studio-run-filters" aria-label={t("filterLabel")}>
        <div className="chip-row">
          <Link className={!status ? "selected" : ""} href={filterHref(current, "status")}>
            {t("allStatuses")}
          </Link>
          {INGESTION_RUN_STATUSES.map((item) => (
            <Link
              className={status === item ? "selected" : ""}
              href={filterHref(current, "status", item)}
              key={item}
            >
              {t(`status.${item.toLowerCase()}`)}
            </Link>
          ))}
        </div>
        <div className="chip-row">
          <Link className={!provider ? "selected" : ""} href={filterHref(current, "provider")}>
            {t("allProviders")}
          </Link>
          {(["SEOUL_OPEN_DATA", "CULTURE_PORTAL"] as const).map((item) => (
            <Link
              className={provider === item ? "selected" : ""}
              href={filterHref(current, "provider", item)}
              key={item}
            >
              {t(`providers.${item}`)}
            </Link>
          ))}
        </div>
      </nav>
      <div className="studio-run-list">
        {data.length ? (
          data.map((run) => (
            <Link href={`/${locale}/studio/runs/${run.id}`} key={run.id}>
              <span>
                <strong>{t(`providers.${run.provider}`)}</strong>
                <small>{dateTime(run.startedAt)} · {t(`trigger.${run.trigger.toLowerCase()}`)}</small>
              </span>
              <span>
                <strong>{t("runCounts", { fetched: run.fetched, inserted: run.inserted })}</strong>
                <small>{duration(run.durationMs)}</small>
              </span>
              <span className={`studio-status is-${run.status.toLowerCase()}`}>
                {t(`status.${run.status.toLowerCase()}`)}
              </span>
            </Link>
          ))
        ) : (
          <p className="studio-empty">{t("empty")}</p>
        )}
      </div>
      {meta.nextCursor ? (
        <Link
          className="button ghost studio-next"
          href={cursorHref(current, meta.nextCursor)}
        >
          {t("nextPage")}
        </Link>
      ) : null}
    </div>
  );
}

export const dynamic = "force-dynamic";
