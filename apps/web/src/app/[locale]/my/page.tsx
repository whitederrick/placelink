import { ArrowUpRight, Bookmark, Clock3, Heart, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { CoupleControls } from "@/features/couples/components/CoupleControls";
import { loadMyOverview, type MyOverview } from "@/features/my";
import { isLocale } from "@/i18n/config";
import { webEnv } from "@/lib/env";

function CourseList({
  courses,
  locale,
  emptyText,
  draftLabel,
  publishedLabel,
}: {
  courses: MyOverview["createdCourses"];
  locale: "ko" | "en";
  emptyText: string;
  draftLabel: string;
  publishedLabel: string;
}) {
  if (courses.length === 0)
    return (
      <div className="my-empty">
        <Bookmark size={20} />
        <p>{emptyText}</p>
      </div>
    );
  return (
    <div className="my-course-list">
      {courses.map((course, index) => {
        const href =
          course.status === "PUBLISHED"
            ? `/${locale}/courses/${course.slug}`
            : course.status === "DRAFT"
              ? `/${locale}/create?step=2&draft=${course.slug}`
              : null;
        const body = (
          <>
            <div className={`archive-visual tone-${index % 3}`}>
              <span>{course.area?.toUpperCase() ?? "SEOUL"}</span>
            </div>
            <div>
              <small>
                {course.status === "PUBLISHED" ? publishedLabel : draftLabel}
              </small>
              <strong>{course.title}</strong>
              <p>
                <MapPin size={11} />
                {course.stops} · <Clock3 size={11} />
                {course.durationMinutes
                  ? `${Math.floor(course.durationMinutes / 60)}H ${course.durationMinutes % 60}M`
                  : "--"}
              </p>
            </div>
            <span className="course-scrap-count">
              <Bookmark size={14} />
              {course.scrapCount}
            </span>
          </>
        );
        return href ? (
          <a className="archive-card" href={href} key={course.slug}>
            {body}
          </a>
        ) : (
          <div className="archive-card" key={course.slug}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

export default async function MyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!webEnv.AUTH_LOGIN_ENABLED) {
    const t = await getTranslations("common");
    return (
      <div className="screen-page my-page">
        <section className="builder-card empty-state">
          <span className="section-kicker">PRE-LAUNCH</span>
          <h1>{t("loginPausedTitle")}</h1>
          <p>{t("loginPausedBody")}</p>
          <a className="summary-link" href={`/${locale}`}>
            {t("backHome")}
          </a>
        </section>
      </div>
    );
  }
  const session = await auth();
  const actor = session?.user?.id
    ? await loadHumanActor(session.user.id)
    : null;
  if (!actor)
    redirect(
      `/api/auth/signin?callbackUrl=${encodeURIComponent(`/${locale}/my`)}`,
    );
  const [t, overview] = await Promise.all([
    getTranslations("my"),
    loadMyOverview(actor, locale),
  ]);
  const profileName = overview.profile.coupleName ?? overview.profile.nickname;
  return (
    <div className="screen-page my-page">
      <div className="profile-top">
        <div>
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{t("greetingNamed", { name: profileName })}</h1>
        </div>
      </div>
      <div className="profile-overview">
        <section className="couple-card">
          <div className="couple-avatars">
            {overview.profile.memberInitials.map((initial, index) => (
              <span key={`${initial}-${index}`}>{initial}</span>
            ))}
            {overview.profile.coupleName ? (
              <Heart className="heart-pin" size={18} fill="currentColor" />
            ) : null}
          </div>
          <span className="couple-label">
            {overview.profile.coupleName ? t("coupleLabel") : t("soloLabel")}
          </span>
          <h2>{profileName}</h2>
          {overview.profile.daysTogether !== null ? (
            <strong>D+{overview.profile.daysTogether}</strong>
          ) : null}
          {overview.profile.startedAt ? (
            <p>
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                new Date(overview.profile.startedAt),
              )}{" "}
              · {t("together")}
            </p>
          ) : (
            <p>{t("soloBody")}</p>
          )}
          <CoupleControls
            connected={Boolean(overview.profile.coupleName)}
            locale={locale}
            labels={{
              invite: t("invite"),
              startedAt: t("startedAt"),
              upgrade: t("upgradeSolo"),
              create: t("createInvite"),
              creating: t("creatingInvite"),
              copy: t("copyInvite"),
              copied: t("copiedInvite"),
              disconnect: t("disconnect"),
              disconnectConfirm: t("disconnectConfirm"),
              error: t("coupleActionError"),
            }}
          />
        </section>
        <div className="profile-stats">
          <div>
            <strong>{overview.stats.made}</strong>
            <span>{t("made")}</span>
          </div>
          <div>
            <strong>{overview.stats.saved}</strong>
            <span>{t("scrapped")}</span>
          </div>
          <div>
            <strong>{overview.stats.received}</strong>
            <span>{t("received")}</span>
          </div>
        </div>
      </div>
      <section className="my-list">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{t("createdKicker")}</span>
            <h2>{t("createdTitle")}</h2>
          </div>
          <ArrowUpRight size={20} />
        </div>
        <CourseList
          courses={overview.createdCourses}
          locale={locale}
          emptyText={t("createdEmpty")}
          draftLabel={t("draftStatus")}
          publishedLabel={t("publishedStatus")}
        />
      </section>
      <section className="my-list saved-list">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{t("savedKicker")}</span>
            <h2>{t("savedTitle")}</h2>
          </div>
          <Bookmark size={20} />
        </div>
        <CourseList
          courses={overview.savedCourses}
          locale={locale}
          emptyText={t("savedEmpty")}
          draftLabel={t("draftStatus")}
          publishedLabel={t("publishedStatus")}
        />
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
