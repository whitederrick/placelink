import { getDatabase } from "@placelink/database";
import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { getLocalizedAlternates, getSiteOrigin } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin();
  const courses = await getDatabase().course.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    select: { slug: true, publishedAt: true, updatedAt: true },
  });

  const staticPages: MetadataRoute.Sitemap = ["", "explore"].flatMap(
    (pathname) =>
      locales.map((locale) => ({
        url: `${origin}/${locale}${pathname ? `/${pathname}` : ""}`,
        changeFrequency: pathname ? "daily" : "hourly",
        priority: pathname ? 0.8 : 1,
        alternates: { languages: getLocalizedAlternates(pathname) },
      })),
  );

  const coursePages: MetadataRoute.Sitemap = courses.flatMap((course) =>
    locales.map((locale) => ({
      url: `${origin}/${locale}/courses/${course.slug}`,
      lastModified: course.updatedAt ?? course.publishedAt ?? undefined,
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: {
        languages: getLocalizedAlternates(`courses/${course.slug}`),
      },
    })),
  );

  return [...staticPages, ...coursePages];
}

export const revalidate = 300;
