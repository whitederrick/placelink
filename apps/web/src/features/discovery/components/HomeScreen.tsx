import { ArrowUpRight, Bookmark, Clock3, MapPin, MoveRight, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { HomeFeed } from "../schema";

export async function HomeScreen({ feed, locale }: Readonly<{ feed: HomeFeed; locale: Locale }>) {
  const t = await getTranslations("home");

  return (
    <div className="home-screen">
      <section className="hero-section">
        <div className="eyebrow"><span className="live-dot" />{t("eyebrow")}</div>
        <h1>{t.rich("headline", { accent: (chunks) => <em>{chunks}</em>, br: () => <br /> })}</h1>
        <p>{t("subhead")}</p>
        <div className="hero-actions">
          <Link className="button primary" href={`/${locale}/explore`}>{t("exploreCta")}<MoveRight size={18} /></Link>
          <Link className="button ghost" href={`/${locale}/create`}>{t("createCta")}</Link>
        </div>
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <span className="hero-sticker">SEOUL<br />37.5665°N</span>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div><span className="section-kicker">{t("anchorKicker")}</span><h2>{t("anchorTitle")}</h2></div>
          <Link href={`/${locale}/explore`}>{t("viewAll")}<ArrowUpRight size={15} /></Link>
        </div>
        <div className="anchor-scroll">
          {feed.happenings.length === 0 ? <div className="empty-state compact"><strong>{t("emptyAnchorsTitle")}</strong><p>{t("emptyAnchorsBody")}</p></div> : feed.happenings.map((happening, index) => (
            <Link className={`anchor-card ${happening.tone}`} href={`/${locale}/create?anchor=${happening.id}`} key={happening.id}>
              <div className="anchor-visual"><span className="anchor-index">0{index + 1}</span><Sparkles size={34} /></div>
              <div className="anchor-copy">
                <div className="anchor-meta"><span><MapPin size={13} />{happening.neighborhood}</span><strong>{happening.dDay}</strong></div>
                <h3>{happening.title}</h3><p>{happening.period}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="content-section feed-section">
        <div className="section-heading">
          <div><span className="section-kicker">{t("feedKicker")}</span><h2>{t("feedTitle")}</h2></div>
          <span className="pulse-label"><span />{t("live")}</span>
        </div>
        <div className="course-grid">
          {feed.courses.length === 0 ? <div className="empty-state"><strong>{t("emptyCoursesTitle")}</strong><p>{t("emptyCoursesBody")}</p><Link className="button primary" href={`/${locale}/create`}>{t("createCta")}</Link></div> : feed.courses.map((course, index) => (
            <Link className="course-card" href={`/${locale}/courses/${course.slug}`} key={course.slug}>
              <div className={`course-cover ${course.tone}`}>
                <span className="cover-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="cover-place">{course.neighborhood}</span>
                <button className="bookmark-button" aria-label={t("scrapLabel")} type="button"><Bookmark size={18} /></button>
                <div className="cover-route"><i /><i /><i /><i /></div>
              </div>
              <div className="course-copy">
                <div className="course-owner"><span>{course.coupleName}</span><small>{t("courseSuffix")}</small></div>
                <div className="course-stats"><span><Clock3 size={14} />{course.duration}</span><span>{t("stops", { count: course.stops })}</span><span>{t("scraps", { count: course.scraps })}</span></div>
                <div className="tag-row">{course.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
