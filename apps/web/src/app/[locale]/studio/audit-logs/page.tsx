import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { AUDIT_ACTOR_TYPES, listAuditLogs } from "@/features/studio-operations";
import { isLocale } from "@/i18n/config";

function queryHref(current: URLSearchParams, key: string, value?: string) {
  const next = new URLSearchParams(current);
  if (value) next.set(key, value);
  else next.delete(key);
  if (key !== "cursor") next.delete("cursor");
  return next.size ? `?${next.toString()}` : "?";
}

export default async function StudioAuditLogsPage({
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
    getTranslations("studioAuditLogs"),
  ]);
  if (!isLocale(locale)) notFound();
  const actor = session?.user?.id
    ? await loadHumanActor(session.user.id)
    : null;
  if (actor?.role !== "ADMIN") notFound();
  const value = (key: string) =>
    typeof rawQuery[key] === "string" ? rawQuery[key] : undefined;
  const search = value("search")?.trim() || undefined;
  const actorType = AUDIT_ACTOR_TYPES.find(
    (item) => item === value("actorType"),
  );
  const targetType = value("targetType")?.trim() || undefined;
  const current = new URLSearchParams();
  if (search) current.set("search", search);
  if (actorType) current.set("actorType", actorType);
  if (targetType) current.set("targetType", targetType);
  const { data, meta } = await listAuditLogs(actor, {
    search,
    actorType,
    targetType,
    cursor: value("cursor"),
  });
  const dateTime = (date: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Seoul",
    }).format(new Date(date));
  const json = (snapshot: unknown) =>
    snapshot === null ? t("none") : JSON.stringify(snapshot, null, 2);

  return (
    <div className="studio-list-page">
      <header className="studio-page-heading">
        <div>
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
      </header>
      <form className="studio-search" action={`/${locale}/studio/audit-logs`}>
        <label htmlFor="audit-search">{t("searchLabel")}</label>
        <div>
          <input
            defaultValue={search}
            id="audit-search"
            name="search"
            placeholder={t("searchPlaceholder")}
            type="search"
          />
          {actorType ? (
            <input name="actorType" type="hidden" value={actorType} />
          ) : null}
          {targetType ? (
            <input name="targetType" type="hidden" value={targetType} />
          ) : null}
          <button className="button primary" type="submit">
            {t("search")}
          </button>
        </div>
      </form>
      <nav className="studio-run-filters" aria-label={t("filterLabel")}>
        <div className="chip-row">
          <Link
            className={!actorType ? "selected" : ""}
            href={queryHref(current, "actorType")}
          >
            {t("allActors")}
          </Link>
          {AUDIT_ACTOR_TYPES.map((item) => (
            <Link
              className={actorType === item ? "selected" : ""}
              href={queryHref(current, "actorType", item)}
              key={item}
            >
              {t(`actorType.${item.toLowerCase()}`)}
            </Link>
          ))}
        </div>
        <div className="chip-row">
          <Link
            className={!targetType ? "selected" : ""}
            href={queryHref(current, "targetType")}
          >
            {t("allTargets")}
          </Link>
          {meta.targetTypes.map((item) => (
            <Link
              className={targetType === item ? "selected" : ""}
              href={queryHref(current, "targetType", item)}
              key={item}
            >
              {item}
            </Link>
          ))}
        </div>
      </nav>
      <div className="audit-log-list">
        {data.length ? (
          data.map((log) => (
            <article key={log.id}>
              <header>
                <span>
                  <strong>{log.action}</strong>
                  <small>
                    {log.targetType} · {log.targetId}
                  </small>
                </span>
                <time>{dateTime(log.createdAt)}</time>
              </header>
              <p>
                {t("actor", {
                  type: t(`actorType.${log.actorType.toLowerCase()}`),
                  id: log.actorId,
                })}
              </p>
              <details>
                <summary>{t("changes")}</summary>
                <div className="audit-change-grid">
                  <section>
                    <h3>{t("before")}</h3>
                    <pre>{json(log.before)}</pre>
                  </section>
                  <section>
                    <h3>{t("after")}</h3>
                    <pre>{json(log.after)}</pre>
                  </section>
                </div>
              </details>
            </article>
          ))
        ) : (
          <p className="studio-empty">{t("empty")}</p>
        )}
      </div>
      {meta.nextCursor ? (
        <Link
          className="button ghost studio-next"
          href={queryHref(current, "cursor", meta.nextCursor)}
        >
          {t("nextPage")}
        </Link>
      ) : null}
    </div>
  );
}

export const dynamic = "force-dynamic";
