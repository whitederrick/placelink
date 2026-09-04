import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { SupportCaseActions } from "@/features/support-cases/components/SupportCaseActions";
import { getSupportCase } from "@/features/support-cases";
import { isLocale } from "@/i18n/config";

export default async function StudioSupportDetailPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string; id: string }>;
}>) {
  const [{ locale, id }, session, t] = await Promise.all([
    params,
    auth(),
    getTranslations("studioSupport"),
  ]);
  if (!isLocale(locale)) notFound();
  const actor = session?.user?.id
    ? await loadHumanActor(session.user.id)
    : null;
  if (actor?.role !== "ADMIN") notFound();
  let supportCase;
  try {
    supportCase = (await getSupportCase(actor, id)).data;
  } catch {
    notFound();
  }
  const dateTime = (date: string | null) =>
    date
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Seoul",
        }).format(new Date(date))
      : "-";
  const labels = {
    save: t("actions.save"),
    saving: t("actions.saving"),
    saved: t("actions.saved"),
    updateError: t("actions.updateError"),
    status: t("actions.status"),
    priority: t("actions.priority"),
    assignment: t("actions.assignment"),
    keepAssignment: t("actions.keepAssignment"),
    assignSelf: t("actions.assignSelf"),
    unassign: t("actions.unassign"),
    dueAt: t("actions.dueAt"),
    reason: t("actions.reason"),
    reasonPlaceholder: t("actions.reasonPlaceholder"),
    entryKind: t("actions.entryKind"),
    staffReply: t("actions.staffReply"),
    internalNote: t("actions.internalNote"),
    entryBody: t("actions.entryBody"),
    entryPlaceholder: t("actions.entryPlaceholder"),
    addEntry: t("actions.addEntry"),
    addingEntry: t("actions.addingEntry"),
    entryAdded: t("actions.entryAdded"),
    entryError: t("actions.entryError"),
    statuses: Object.fromEntries(
      ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"].map(
        (item) => [item, t(`status.${item.toLowerCase()}`)],
      ),
    ),
    priorities: Object.fromEntries(
      ["LOW", "NORMAL", "HIGH", "URGENT"].map((item) => [
        item,
        t(`priority.${item.toLowerCase()}`),
      ]),
    ),
  };

  return (
    <div className="studio-detail-page">
      <Link className="studio-breadcrumb" href={`/${locale}/studio/support`}>
        ← {t("backToCases")}
      </Link>
      <header className="studio-page-heading">
        <div>
          <span className="section-kicker">{t("detailKicker")}</span>
          <h1>{supportCase.subject}</h1>
          <p>{supportCase.id}</p>
        </div>
        <span
          className={`studio-status is-support-${supportCase.status.toLowerCase()}`}
        >
          {t(`status.${supportCase.status.toLowerCase()}`)}
        </span>
      </header>
      <section className="studio-detail-grid">
        <article className="studio-panel">
          <h2>{t("caseInfo")}</h2>
          <dl className="studio-definition-list">
            <div>
              <dt>{t("typeLabel")}</dt>
              <dd>{t(`type.${supportCase.type.toLowerCase()}`)}</dd>
            </div>
            <div>
              <dt>{t("priorityLabel")}</dt>
              <dd>{t(`priority.${supportCase.priority.toLowerCase()}`)}</dd>
            </div>
            <div>
              <dt>{t("reporter")}</dt>
              <dd>
                {supportCase.reporter
                  ? `${supportCase.reporter.nickname} · ${supportCase.reporter.email ?? supportCase.reporter.id}`
                  : t("anonymous")}
              </dd>
            </div>
            <div>
              <dt>{t("assignee")}</dt>
              <dd>{supportCase.assignee?.nickname ?? t("unassigned")}</dd>
            </div>
            <div>
              <dt>{t("createdAt")}</dt>
              <dd>{dateTime(supportCase.createdAt)}</dd>
            </div>
            <div>
              <dt>{t("dueAt")}</dt>
              <dd>{dateTime(supportCase.dueAt)}</dd>
            </div>
          </dl>
        </article>
        <article className="studio-panel">
          <h2>{t("request")}</h2>
          <p className="support-description">{supportCase.description}</p>
          {supportCase.targetType && supportCase.targetId ? (
            <dl className="studio-definition-list">
              <div>
                <dt>{t("target")}</dt>
                <dd>
                  {supportCase.targetType} · {supportCase.targetId}
                </dd>
              </div>
            </dl>
          ) : null}
        </article>
      </section>
      <section className="studio-panel">
        <div className="studio-panel-heading">
          <div>
            <h2>{t("timeline")}</h2>
            <p>{t("timelineBody")}</p>
          </div>
        </div>
        <div className="support-timeline">
          {supportCase.entries.map((entry) => (
            <article
              className={`is-${entry.kind.toLowerCase()}`}
              key={entry.id}
            >
              <header>
                <strong>{t(`entryKind.${entry.kind.toLowerCase()}`)}</strong>
                <time>{dateTime(entry.createdAt)}</time>
              </header>
              <p>{entry.body}</p>
              <small>{entry.authorId}</small>
            </article>
          ))}
        </div>
      </section>
      <SupportCaseActions
        caseId={supportCase.id}
        current={{
          status: supportCase.status,
          priority: supportCase.priority,
          dueAt: supportCase.dueAt,
          updatedAt: supportCase.updatedAt,
        }}
        labels={labels}
      />
    </div>
  );
}

export const dynamic = "force-dynamic";
