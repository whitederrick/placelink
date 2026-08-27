import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { listHappeningsForCuration } from "@/features/admin-curation";
import { HappeningCurationPanel } from "@/features/admin-curation/components/HappeningCurationPanel";
import { loadHumanActor } from "@/features/auth";
import { isLocale } from "@/i18n/config";

const STATUSES = ["UPCOMING", "ACTIVE", "ENDED"] as const;
type HappeningStatus = (typeof STATUSES)[number];

function curationHref(
  status: HappeningStatus | undefined,
  anchor: string | undefined,
  change: { status?: HappeningStatus | null; anchor?: string | null },
) {
  const nextStatus =
    change.status === null ? undefined : (change.status ?? status);
  const nextAnchor =
    change.anchor === null ? undefined : (change.anchor ?? anchor);
  const params = new URLSearchParams();
  if (nextStatus) params.set("status", nextStatus);
  if (nextAnchor) params.set("anchor", nextAnchor);
  return params.size ? `?${params.toString()}` : "?";
}

export default async function HappeningOperationsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; anchor?: string }>;
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

  const status = STATUSES.find((value) => value === query.status);
  const anchor = ["true", "false"].includes(query.anchor ?? "")
    ? query.anchor
    : undefined;
  const [{ data }, t] = await Promise.all([
    listHappeningsForCuration(actor, { locale, status, anchor }),
    getTranslations("curation"),
  ]);

  return (
    <div className="screen-page curation-dashboard">
      <header className="analytics-heading">
        <span className="section-kicker">{t("kicker")}</span>
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
        <div className="ingestion-nav">
          <Link href={`/${locale}/studio/ingestions`}>{t("viewIngestions")}</Link>
          <Link href={`/${locale}/studio/analytics`}>{t("viewAnalytics")}</Link>
        </div>
      </header>

      <nav className="curation-filters" aria-label={t("filterLabel")}>
        <div className="chip-row">
          <Link
            className={!status ? "selected" : ""}
            href={curationHref(status, anchor, { status: null })}
          >
            {t("allStatuses")}
          </Link>
          {STATUSES.map((value) => (
            <Link
              className={status === value ? "selected" : ""}
              href={curationHref(status, anchor, { status: value })}
              key={value}
            >
              {t(`status.${value.toLowerCase()}`)}
            </Link>
          ))}
        </div>
        <div className="chip-row">
          <Link
            className={!anchor ? "selected" : ""}
            href={curationHref(status, anchor, { anchor: null })}
          >
            {t("allAnchors")}
          </Link>
          <Link
            className={anchor === "true" ? "selected" : ""}
            href={curationHref(status, anchor, { anchor: "true" })}
          >
            {t("anchoredOnly")}
          </Link>
          <Link
            className={anchor === "false" ? "selected" : ""}
            href={curationHref(status, anchor, { anchor: "false" })}
          >
            {t("unanchoredOnly")}
          </Link>
        </div>
      </nav>

      <HappeningCurationPanel initialEntries={data} locale={locale} />
    </div>
  );
}

export const dynamic = "force-dynamic";
