import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import {
  SUPPORT_CASE_STATUSES,
  SUPPORT_CASE_TYPES,
  SUPPORT_PRIORITIES,
  listSupportCases,
  getSupportCaseAttention,
} from "@/features/support-cases";
import { isLocale } from "@/i18n/config";
import { SupportCaseBulkActions } from "@/features/support-cases/components/SupportCaseBulkActions";
import { SavedFilters } from "@/features/studio-operations/components/SavedFilters";

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

export default async function StudioSupportPage({
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
    getTranslations("studioSupport"),
  ]);
  if (!isLocale(locale)) notFound();
  const actor = session?.user?.id
    ? await loadHumanActor(session.user.id)
    : null;
  if (actor?.role !== "ADMIN") notFound();
  const value = (key: string) =>
    typeof rawQuery[key] === "string" ? rawQuery[key] : undefined;
  const search = value("search")?.trim() || undefined;
  const status = SUPPORT_CASE_STATUSES.find((item) => item === value("status"));
  const type = SUPPORT_CASE_TYPES.find((item) => item === value("type"));
  const priority = SUPPORT_PRIORITIES.find(
    (item) => item === value("priority"),
  );
  const attention = ["URGENT", "OVERDUE", "UNASSIGNED"].find((item) => item === value("attention"));
  const current = new URLSearchParams();
  if (search) current.set("search", search);
  if (status) current.set("status", status);
  if (type) current.set("type", type);
  if (priority) current.set("priority", priority);
  if (attention) current.set("attention", attention);
  const [{ data, meta }, attentionSummary] = await Promise.all([
    listSupportCases(actor, {
      search,
      status,
      type,
      priority,
      attention: attention as "URGENT" | "OVERDUE" | "UNASSIGNED" | undefined,
      cursor: value("cursor"),
    }),
    getSupportCaseAttention(actor),
  ]);
  const dateTime = (date: string | null) =>
    date
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Seoul",
        }).format(new Date(date))
      : "-";

  return (
    <div className="studio-list-page">
      <header className="studio-page-heading">
        <div>
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
      </header>
      <section className="studio-metric-grid" aria-label="문의 관제 요약">
        <Link href={filterHref(current, "attention", "URGENT")}><strong>{attentionSummary.urgent}</strong><span>긴급</span></Link>
        <Link href={filterHref(current, "attention", "OVERDUE")}><strong>{attentionSummary.overdue}</strong><span>기한 초과</span></Link>
        <Link href={filterHref(current, "attention", "UNASSIGNED")}><strong>{attentionSummary.unassigned}</strong><span>미배정</span></Link>
      </section>
      <SavedFilters storageKey="placelink:studio-support-filters" currentHref={`/${locale}/studio/support${current.size ? `?${current.toString()}` : ""}`} />
      <form className="studio-search" action={`/${locale}/studio/support`}>
        <label htmlFor="support-search">{t("searchLabel")}</label>
        <div>
          <input
            defaultValue={search}
            id="support-search"
            name="search"
            placeholder={t("searchPlaceholder")}
            type="search"
          />
          {status ? <input name="status" type="hidden" value={status} /> : null}
          {type ? <input name="type" type="hidden" value={type} /> : null}
          {priority ? (
            <input name="priority" type="hidden" value={priority} />
          ) : null}
          {attention ? <input name="attention" type="hidden" value={attention} /> : null}
          <button className="button primary" type="submit">
            {t("search")}
          </button>
        </div>
      </form>
      <nav className="studio-run-filters" aria-label={t("filterLabel")}>
        <div className="chip-row">
          <Link
            className={!status ? "selected" : ""}
            href={filterHref(current, "status")}
          >
            {t("allStatuses")}
          </Link>
          {SUPPORT_CASE_STATUSES.map((item) => (
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
          <Link className={!attention ? "selected" : ""} href={filterHref(current, "attention")}>전체 관제</Link>
          <Link className={attention === "URGENT" ? "selected" : ""} href={filterHref(current, "attention", "URGENT")}>긴급</Link>
          <Link className={attention === "OVERDUE" ? "selected" : ""} href={filterHref(current, "attention", "OVERDUE")}>기한 초과</Link>
          <Link className={attention === "UNASSIGNED" ? "selected" : ""} href={filterHref(current, "attention", "UNASSIGNED")}>미배정</Link>
        </div>
        <div className="chip-row">
          <Link
            className={!type ? "selected" : ""}
            href={filterHref(current, "type")}
          >
            {t("allTypes")}
          </Link>
          {SUPPORT_CASE_TYPES.map((item) => (
            <Link
              className={type === item ? "selected" : ""}
              href={filterHref(current, "type", item)}
              key={item}
            >
              {t(`type.${item.toLowerCase()}`)}
            </Link>
          ))}
        </div>
        <div className="chip-row">
          <Link
            className={!priority ? "selected" : ""}
            href={filterHref(current, "priority")}
          >
            {t("allPriorities")}
          </Link>
          {SUPPORT_PRIORITIES.map((item) => (
            <Link
              className={priority === item ? "selected" : ""}
              href={filterHref(current, "priority", item)}
              key={item}
            >
              {t(`priority.${item.toLowerCase()}`)}
            </Link>
          ))}
        </div>
      </nav>
      {data.length ? <SupportCaseBulkActions items={data.map((item) => ({ id: item.id, updatedAt: item.updatedAt }))} /> : null}
      <div className="support-case-list">
        {data.length ? (
          data.map((supportCase) => (
            <Link
              href={`/${locale}/studio/support/${supportCase.id}`}
              key={supportCase.id}
            >
              <span>
                <strong>{supportCase.subject}</strong>
                <small>
                  {supportCase.reporter?.nickname ?? t("anonymous")} ·{" "}
                  {dateTime(supportCase.createdAt)}
                </small>
              </span>
              <span>
                <strong>{t(`type.${supportCase.type.toLowerCase()}`)}</strong>
                <small>{t("entries", { count: supportCase.entryCount })}</small>
              </span>
              <span>
                <strong>
                  {supportCase.assignee?.nickname ?? t("unassigned")}
                </strong>
                <small>{t("due", { date: dateTime(supportCase.dueAt) })}</small>
              </span>
              <span
                className={`studio-status is-priority-${supportCase.priority.toLowerCase()}`}
              >
                {t(`priority.${supportCase.priority.toLowerCase()}`)}
              </span>
              <span
                className={`studio-status is-support-${supportCase.status.toLowerCase()}`}
              >
                {t(`status.${supportCase.status.toLowerCase()}`)}
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
