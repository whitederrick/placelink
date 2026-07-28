import type { Metadata } from "next";
import { Clock3, MapPin, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  CourseScrapMetric,
  CourseShareActions,
  loadPublishedCourse,
} from "@/features/courses";
import { isLocale } from "@/i18n/config";
import { getLocalizedAlternates } from "@/lib/site-url";

const getCourse = cache(async (slug: string, locale: string) =>
  loadPublishedCourse(slug, locale),
);

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}H ${String(minutes % 60).padStart(2, "0")}M`;
}

function timeAt(index: number, nodes: Array<{ walkMinutes: number | null }>) {
  const elapsed = nodes
    .slice(0, index)
    .reduce(
      (total, _node, nodeIndex) =>
        total + 60 + (nodes[nodeIndex + 1]?.walkMinutes ?? 0),
      0,
    );
  const date = new Date(Date.UTC(2026, 0, 1, 14, elapsed));
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  try {
    const course = await getCourse(slug, locale);
    const description =
      course.description ??
      course.nodes.map((node) => node.place.name).join(" → ");
    const languages = getLocalizedAlternates(`courses/${slug}`);
    return {
      title: course.title,
      description,
      alternates: {
        canonical: languages[locale],
        languages,
      },
      openGraph: {
        title: course.title,
        description,
        type: "article",
        url: languages[locale],
        images: [`/${locale}/courses/${slug}/opengraph-image`],
      },
      twitter: {
        card: "summary_large_image",
        title: course.title,
        description,
        images: [`/${locale}/courses/${slug}/opengraph-image`],
      },
    };
  } catch {
    return {};
  }
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ published?: string }>;
}) {
  const [{ locale, slug }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const [t, categoryT] = await Promise.all([
    getTranslations("course"),
    getTranslations("explore.categories"),
  ]);
  let course;
  try {
    course = await getCourse(slug, locale);
  } catch {
    notFound();
  }
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: course.title,
    description: course.description ?? undefined,
    itinerary: course.nodes.map((node, index) => ({
      "@type": "TouristAttraction",
      position: index + 1,
      name: node.place.name,
      address: node.place.address,
      geo: {
        "@type": "GeoCoordinates",
        latitude: node.place.lat,
        longitude: node.place.lng,
      },
    })),
  };
  return (
    <div className="course-detail">
      {query.published === "1" ? (
        <p className="published-banner">
          <Trophy size={15} />
          {t("publishedSuccess")}
        </p>
      ) : null}
      <section className="trophy-hero">
        <span className="hall-badge">
          <Trophy size={14} />
          {t("publishedBadge")}
        </span>
        <p>
          PLACE-LINK · {course.nodes[0]?.place.area?.toUpperCase() ?? "SEOUL"}
        </p>
        <h1>{course.title}</h1>
        {course.description ? (
          <p className="course-description">{course.description}</p>
        ) : null}
        <div className="trophy-meta">
          <span>
            <Clock3 size={14} />
            {formatDuration(course.durationMinutes)}
          </span>
          <span>
            <MapPin size={14} />
            {t("stops", { count: course.nodes.length })}
          </span>
          <CourseScrapMetric
            slug={course.slug}
            initialScrapCount={course.scrapCount}
          />
        </div>
        <div className="trophy-glow" />
      </section>
      <section className="timeline-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{t("routeKicker")}</span>
            <h2>{t("routeTitle")}</h2>
          </div>
        </div>
        <div className="timeline">
          {course.nodes.map((node, index) => {
            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${node.place.lat},${node.place.lng}`;
            const happening = node.happening;
            const period = happening
              ? `${new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(happening.startsAt))} – ${new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(happening.endsAt))}`
              : null;
            return (
              <div className="timeline-stop" key={node.id}>
                <div className="time-column">
                  <strong>{timeAt(index, course.nodes)}</strong>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="timeline-dot" />
                <div className="stop-copy">
                  <small>
                    {categoryT(node.place.category)}
                    {period
                      ? ` · ${happening?.status === "ENDED" ? t("endedPopup") : period}`
                      : ""}
                  </small>
                  <h3>{node.place.name}</h3>
                  <p>{node.tip || t("noTip")}</p>
                  <a href={mapUrl} target="_blank" rel="noreferrer">
                    <MapPin size={13} />
                    {t("openMap")}
                  </a>
                  {index < course.nodes.length - 1 ? (
                    <em>
                      {t("walkMinutes", {
                        minutes: course.nodes[index + 1]?.walkMinutes ?? 0,
                      })}
                    </em>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <CourseShareActions
        locale={locale}
        title={course.title}
        slug={course.slug}
        initialScrapCount={course.scrapCount}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}

export const revalidate = 300;
