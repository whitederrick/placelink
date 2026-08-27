import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { getIngestionRun } from "@/features/studio-operations";
import { isLocale } from "@/i18n/config";

export default async function IngestionRunDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; id: string }> }>) {
  const [{ locale, id }, session, t] = await Promise.all([
    params,
    auth(),
    getTranslations("ingestionRuns"),
  ]);
  if (!isLocale(locale)) notFound();
  const actor = session?.user?.id ? await loadHumanActor(session.user.id) : null;
  if (actor?.role !== "ADMIN") notFound();
  let run;
  try {
    run = (await getIngestionRun(actor, id)).data;
  } catch {
    notFound();
  }
  const dateTime = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "long",
          timeZone: "Asia/Seoul",
        }).format(new Date(value))
      : t("running");

  return (
    <div className="studio-detail-page">
      <Link className="studio-breadcrumb" href={`/${locale}/studio/runs`}>
        ← {t("backToRuns")}
      </Link>
      <header className="studio-page-heading">
        <div>
          <span className="section-kicker">{t("detailKicker")}</span>
          <h1>{t(`providers.${run.provider}`)}</h1>
          <p>{run.id}</p>
        </div>
        <span className={`studio-status is-${run.status.toLowerCase()}`}>
          {t(`status.${run.status.toLowerCase()}`)}
        </span>
      </header>
      {run.errorMessage ? <div className="studio-error-banner">{run.errorMessage}</div> : null}
      <section className="studio-detail-grid">
        <article className="studio-panel">
          <h2>{t("executionSummary")}</h2>
          <dl className="studio-definition-list">
            <div><dt>{t("startedAt")}</dt><dd>{dateTime(run.startedAt)}</dd></div>
            <div><dt>{t("finishedAt")}</dt><dd>{dateTime(run.finishedAt)}</dd></div>
            <div><dt>{t("triggerLabel")}</dt><dd>{t(`trigger.${run.trigger.toLowerCase()}`)}</dd></div>
            <div><dt>{t("actor")}</dt><dd>{run.actorId} · {run.actorType}</dd></div>
          </dl>
        </article>
        <article className="studio-panel">
          <h2>{t("resultSummary")}</h2>
          <dl className="studio-definition-list numeric">
            <div><dt>{t("totalAvailable")}</dt><dd>{run.totalAvailable?.toLocaleString(locale) ?? "-"}</dd></div>
            <div><dt>{t("fetched")}</dt><dd>{run.fetched.toLocaleString(locale)}</dd></div>
            <div><dt>{t("selected")}</dt><dd>{run.selected.toLocaleString(locale)}</dd></div>
            <div><dt>{t("inserted")}</dt><dd>{run.inserted.toLocaleString(locale)}</dd></div>
            <div><dt>{t("unchanged")}</dt><dd>{run.unchanged.toLocaleString(locale)}</dd></div>
          </dl>
        </article>
      </section>
      <section className="studio-panel">
        <h2>{t("request")}</h2>
        <pre className="studio-json">{JSON.stringify(run.requestPayload, null, 2)}</pre>
      </section>
      <section className="studio-panel">
        <div className="studio-panel-heading">
          <div>
            <h2>{t("createdRecords")}</h2>
            <p>{t("createdRecordsBody")}</p>
          </div>
        </div>
        <div className="studio-record-table">
          {run.records.length ? (
            run.records.map((record) => (
              <Link
                href={`/${locale}/studio/ingestions?status=${record.status === "STAGED" ? "NORMALIZED" : record.status}`}
                key={record.id}
              >
                <span><strong>{record.title ?? record.externalId}</strong><small>{record.externalId}</small></span>
                <span>{t(`recordStatus.${record.status.toLowerCase()}`)}</span>
              </Link>
            ))
          ) : (
            <p className="studio-empty">{t("noCreatedRecords")}</p>
          )}
        </div>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
