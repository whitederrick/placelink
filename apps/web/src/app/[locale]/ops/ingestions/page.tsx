import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  HAPPENING_KINDS,
  INGESTION_PROVIDERS,
  OPERATOR_TYPES,
  listIngestionsForReview,
} from "@/features/ingestion-review";
import { IngestionReviewPanel } from "@/features/ingestion-review/components/IngestionReviewPanel";
import { IngestionSyncControl } from "@/features/ingestion-review/components/IngestionSyncControl";
import { loadHumanActor } from "@/features/auth";
import { isLocale } from "@/i18n/config";

const STATUSES = ["NORMALIZED", "MERGED", "REJECTED", "FAILED"] as const;

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

function seoulDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export default async function IngestionOperationsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [{ locale }, rawQuery, session] = await Promise.all([
    params,
    searchParams,
    auth(),
  ]);
  if (!isLocale(locale)) notFound();
  const actor = session?.user?.id ? await loadHumanActor(session.user.id) : null;
  if (actor?.role !== "ADMIN") notFound();

  const value = (key: string) =>
    typeof rawQuery[key] === "string" ? rawQuery[key] : undefined;
  const status = STATUSES.find((item) => item === value("status")) ?? "NORMALIZED";
  const provider = INGESTION_PROVIDERS.find((item) => item === value("provider"));
  const happeningKind = HAPPENING_KINDS.find(
    (item) => item === value("happeningKind"),
  );
  const operatorType = OPERATOR_TYPES.find(
    (item) => item === value("operatorType"),
  );
  const current = new URLSearchParams();
  current.set("status", status);
  if (provider) current.set("provider", provider);
  if (happeningKind) current.set("happeningKind", happeningKind);
  if (operatorType) current.set("operatorType", operatorType);

  const [{ data, meta }, t] = await Promise.all([
    listIngestionsForReview(actor, {
      status,
      provider,
      happeningKind,
      operatorType,
      cursor: value("cursor"),
    }),
    getTranslations("ingestionReview"),
  ]);

  const filters = [
    { key: "provider", value: provider, values: INGESTION_PROVIDERS },
    { key: "happeningKind", value: happeningKind, values: HAPPENING_KINDS },
    { key: "operatorType", value: operatorType, values: OPERATOR_TYPES },
  ] as const;

  return (
    <div className="screen-page ingestion-dashboard">
      <header className="analytics-heading">
        <span className="section-kicker">{t("kicker")}</span>
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
        <div className="ingestion-nav">
          <Link href={`/${locale}/ops/happenings`}>{t("viewCuration")}</Link>
          <Link href={`/${locale}/ops/analytics`}>{t("viewAnalytics")}</Link>
        </div>
      </header>

      <IngestionSyncControl fromDate={seoulDate(new Date())} />

      <nav className="ingestion-filters" aria-label={t("filterLabel")}>
        <div className="chip-row">
          {STATUSES.map((item) => (
            <Link
              className={status === item ? "selected" : ""}
              href={filterHref(current, "status", item)}
              key={item}
            >
              {t(`status.${item.toLowerCase()}`)}
            </Link>
          ))}
        </div>
        {filters.map((filter) => (
          <div className="chip-row" key={filter.key}>
            <Link
              className={!filter.value ? "selected" : ""}
              href={filterHref(current, filter.key)}
            >
              {t(`all.${filter.key}`)}
            </Link>
            {filter.values.map((item) => (
              <Link
                className={filter.value === item ? "selected" : ""}
                href={filterHref(current, filter.key, item)}
                key={item}
              >
                {t(`${filter.key}.${item.toLowerCase()}`)}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <IngestionReviewPanel initialEntries={data} locale={locale} />
      {meta.nextCursor ? (
        <Link
          className="button ghost ingestion-more"
          href={cursorHref(current, meta.nextCursor)}
        >
          {t("nextPage")}
        </Link>
      ) : null}
    </div>
  );
}

export const dynamic = "force-dynamic";
