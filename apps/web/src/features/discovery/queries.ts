import { getDatabase } from "@placelink/database";
import type { HomeFeedLocale, HomeFeedQuery } from "./schema";

const ANCHOR_LIMIT = 10;

export async function selectHomeFeedRecords(
  locale: HomeFeedLocale,
  query: HomeFeedQuery,
) {
  const database = getDatabase();
  const selectedTags = [query.situation, query.budget, query.mood].filter(
    (slug): slug is string => Boolean(slug),
  );
  const courseWhere = {
    status: "PUBLISHED" as const,
    deletedAt: null,
    ...(query.area
      ? { nodes: { some: { place: { areaSlug: query.area } } } }
      : {}),
    ...(selectedTags.length
      ? {
          AND: selectedTags.map((slug) => ({
            tags: { some: { tag: { slug } } },
          })),
        }
      : {}),
  };
  const courseSelect = {
    slug: true,
    durationMinutes: true,
    viewCount: true,
    scrapCount: true,
    couple: { select: { displayName: true, status: true } },
    creatorUser: { select: { nickname: true } },
    nodes: {
      orderBy: { orderIndex: "asc" as const },
      take: 1,
      select: {
        place: {
          select: {
            areaSlug: true,
            translations: {
              where: { locale },
              take: 1,
              select: { name: true },
            },
          },
        },
      },
    },
    tags: {
      take: 3,
      select: {
        tag: { select: { labelKo: true, labelEn: true } },
      },
    },
    _count: { select: { nodes: true, scraps: true } },
  };

  const [happenings, courses, hallCandidates, filterTags] = await Promise.all([
    database.happening.findMany({
      where: { isAnchor: true, status: { in: ["UPCOMING", "ACTIVE"] } },
      orderBy: [{ endsAt: "asc" }, { id: "asc" }],
      take: ANCHOR_LIMIT,
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        translations: {
          where: { locale },
          take: 1,
          select: { title: true },
        },
        place: {
          select: {
            areaSlug: true,
            translations: {
              where: { locale },
              take: 1,
              select: { name: true },
            },
          },
        },
      },
    }),
    database.course.findMany({
      where: courseWhere,
      orderBy:
        query.sort === "popular"
          ? [
              { scrapCount: "desc" as const },
              { viewCount: "desc" as const },
              { publishedAt: "desc" as const },
            ]
          : [{ publishedAt: "desc" as const }, { id: "desc" as const }],
      take: query.take + 1,
      cursor: query.cursor ? { slug: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0,
      select: courseSelect,
    }),
    database.course.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        OR: [{ coupleId: null }, { couple: { status: "ACTIVE" } }],
      },
      orderBy: [
        { scrapCount: "desc" },
        { viewCount: "desc" },
        { publishedAt: "desc" },
      ],
      take: 10,
      select: courseSelect,
    }),
    database.tag.findMany({
      where: {
        isActive: true,
        kind: { in: ["SITUATION", "BUDGET", "MOOD"] },
      },
      orderBy: [{ kind: "asc" }, { slug: "asc" }],
      select: {
        slug: true,
        kind: true,
        labelKo: true,
        labelEn: true,
      },
    }),
  ]);

  return { happenings, courses, hallCandidates, filterTags };
}

export type HomeFeedRecords = Awaited<ReturnType<typeof selectHomeFeedRecords>>;
