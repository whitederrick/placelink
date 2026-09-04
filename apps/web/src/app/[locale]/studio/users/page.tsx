import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import {
  STUDIO_AUTH_PROVIDERS,
  STUDIO_USER_STATUSES,
  listStudioUsers,
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

export default async function StudioUsersPage({
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
    getTranslations("studioUsers"),
  ]);
  if (!isLocale(locale)) notFound();
  const actor = session?.user?.id ? await loadHumanActor(session.user.id) : null;
  if (actor?.role !== "ADMIN") notFound();
  const value = (key: string) =>
    typeof rawQuery[key] === "string" ? rawQuery[key] : undefined;
  const search = value("search")?.trim() || undefined;
  const status = STUDIO_USER_STATUSES.find((item) => item === value("status"));
  const provider = STUDIO_AUTH_PROVIDERS.find(
    (item) => item === value("provider"),
  );
  const current = new URLSearchParams();
  if (search) current.set("search", search);
  if (status) current.set("status", status);
  if (provider) current.set("provider", provider);
  const { data, meta } = await listStudioUsers(actor, {
    search,
    status,
    provider,
    cursor: value("cursor"),
  });
  const dateTime = (date: string | null) =>
    date
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Seoul",
        }).format(new Date(date))
      : t("noActivity");

  return (
    <div className="studio-list-page">
      <header className="studio-page-heading">
        <div>
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
      </header>
      <form className="studio-search" action={`/${locale}/studio/users`}>
        <label htmlFor="studio-user-search">{t("searchLabel")}</label>
        <div>
          <input
            defaultValue={search}
            id="studio-user-search"
            name="search"
            placeholder={t("searchPlaceholder")}
            type="search"
          />
          {status ? <input name="status" type="hidden" value={status} /> : null}
          {provider ? <input name="provider" type="hidden" value={provider} /> : null}
          <button className="button primary" type="submit">{t("search")}</button>
        </div>
      </form>
      <nav className="studio-run-filters" aria-label={t("filterLabel")}>
        <div className="chip-row">
          <Link className={!status ? "selected" : ""} href={filterHref(current, "status")}>
            {t("allStatuses")}
          </Link>
          {STUDIO_USER_STATUSES.map((item) => (
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
          {STUDIO_AUTH_PROVIDERS.map((item) => (
            <Link
              className={provider === item ? "selected" : ""}
              href={filterHref(current, "provider", item)}
              key={item}
            >
              {t(`provider.${item.toLowerCase()}`)}
            </Link>
          ))}
        </div>
      </nav>
      <div className="studio-user-list">
        {data.length ? data.map((user) => (
          <Link href={`/${locale}/studio/users/${user.id}`} key={user.id}>
            <span>
              <strong>{user.nickname}</strong>
              <small>{user.email ?? user.id}</small>
            </span>
            <span>
              <strong>{user.couple?.partnerNickname ?? t("solo")}</strong>
              <small>{t("counts", { courses: user.courseCount, scraps: user.scrapCount })}</small>
            </span>
            <span>
              <strong>{user.providers.map((item) => t(`provider.${item.toLowerCase()}`)).join(" · ") || "-"}</strong>
              <small>{t("lastActive", { date: dateTime(user.lastActiveAt) })}</small>
            </span>
            <span className={`studio-status is-${user.status.toLowerCase()}`}>
              {t(`status.${user.status.toLowerCase()}`)}
            </span>
          </Link>
        )) : <p className="studio-empty">{t("empty")}</p>}
      </div>
      {meta.nextCursor ? (
        <Link className="button ghost studio-next" href={cursorHref(current, meta.nextCursor)}>
          {t("nextPage")}
        </Link>
      ) : null}
    </div>
  );
}

export const dynamic = "force-dynamic";
