import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { getStudioUser } from "@/features/studio-operations";
import { isLocale } from "@/i18n/config";

export default async function StudioUserDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; id: string }> }>) {
  const [{ locale, id }, session, t] = await Promise.all([
    params,
    auth(),
    getTranslations("studioUsers"),
  ]);
  if (!isLocale(locale)) notFound();
  const actor = session?.user?.id ? await loadHumanActor(session.user.id) : null;
  if (actor?.role !== "ADMIN") notFound();
  let user;
  try {
    user = (await getStudioUser(actor, id)).data;
  } catch {
    notFound();
  }
  const dateTime = (date: string | null) => date
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Seoul",
      }).format(new Date(date))
    : "-";

  return (
    <div className="studio-detail-page">
      <Link className="studio-breadcrumb" href={`/${locale}/studio/users`}>
        ← {t("backToUsers")}
      </Link>
      <header className="studio-page-heading">
        <div>
          <span className="section-kicker">{t("detailKicker")}</span>
          <h1>{user.nickname}</h1>
          <p>{user.email ?? user.id}</p>
        </div>
        <span className={`studio-status is-${user.status.toLowerCase()}`}>
          {t(`status.${user.status.toLowerCase()}`)}
        </span>
      </header>
      <section className="studio-detail-grid">
        <article className="studio-panel">
          <h2>{t("account")}</h2>
          <dl className="studio-definition-list">
            <div><dt>{t("userId")}</dt><dd>{user.id}</dd></div>
            <div><dt>{t("email")}</dt><dd>{user.email ?? "-"}</dd></div>
            <div><dt>{t("providers")}</dt><dd>{user.identities.map((item) => t(`provider.${item.provider.toLowerCase()}`)).join(" · ") || "-"}</dd></div>
            <div><dt>{t("joinedAt")}</dt><dd>{dateTime(user.createdAt)}</dd></div>
            <div><dt>{t("lastActiveLabel")}</dt><dd>{dateTime(user.lastActiveAt)}</dd></div>
          </dl>
        </article>
        <article className="studio-panel">
          <h2>{t("relationship")}</h2>
          {user.currentCouple ? (
            <dl className="studio-definition-list">
              <div><dt>{t("coupleName")}</dt><dd>{user.currentCouple.displayName}</dd></div>
              <div><dt>{t("members")}</dt><dd>{user.currentCouple.members.map((member) => member.nickname).join(" · ")}</dd></div>
              <div><dt>{t("startedAt")}</dt><dd>{dateTime(user.currentCouple.startedAt)}</dd></div>
              <div><dt>{t("connectedAt")}</dt><dd>{dateTime(user.currentCouple.joinedAt)}</dd></div>
            </dl>
          ) : <p className="studio-empty">{t("noCouple")}</p>}
        </article>
      </section>
      <section className="studio-panel">
        <div className="studio-panel-heading"><div><h2>{t("courses")}</h2><p>{t("coursesBody")}</p></div></div>
        <div className="studio-record-table studio-user-records">
          {user.courses.length ? user.courses.map((course) => (
            <Link href={`/${locale}/courses/${course.slug}`} key={course.id}>
              <span><strong>{course.title}</strong><small>{dateTime(course.createdAt)}</small></span>
              <span>{t(`ownership.${course.ownership.toLowerCase()}`)}</span>
              <span className={`studio-status is-${course.status.toLowerCase()}`}>{t(`courseStatus.${course.status.toLowerCase()}`)}</span>
            </Link>
          )) : <p className="studio-empty">{t("noCourses")}</p>}
        </div>
      </section>
      <section className="studio-detail-grid">
        <article className="studio-panel">
          <div className="studio-panel-heading"><div><h2>{t("scraps")}</h2><p>{t("scrapsBody")}</p></div></div>
          <div className="studio-record-table compact">
            {user.scraps.length ? user.scraps.map((scrap) => (
              <Link href={`/${locale}/courses/${scrap.course.slug}`} key={scrap.id}>
                <span><strong>{scrap.course.title}</strong><small>{dateTime(scrap.createdAt)}</small></span>
              </Link>
            )) : <p className="studio-empty">{t("noScraps")}</p>}
          </div>
        </article>
        <article className="studio-panel">
          <div className="studio-panel-heading"><div><h2>{t("activity")}</h2><p>{t("activityBody")}</p></div></div>
          <div className="studio-activity-list">
            {user.recentActivity.length ? user.recentActivity.map((event) => (
              <div key={event.id}><strong>{event.name}</strong><time>{dateTime(event.createdAt)}</time></div>
            )) : <p className="studio-empty">{t("noActivity")}</p>}
          </div>
        </article>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
