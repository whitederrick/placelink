import { getDatabase } from "@placelink/database";
import type { HomeFeedLocale, HomeFeedQuery } from "./schema";

const ANCHOR_LIMIT = 10;
const HALL_CANDIDATE_LIMIT = 10;
const HALL_WINDOW_MILLISECONDS = 7 * 24 * 60 * 60 * 1_000;

export async function selectHomeFeedRecords(
  locale: HomeFeedLocale,
  query: HomeFeedQuery,
  now: Date,
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
    id: true,
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

  const [happenings, courses, weeklyScrapGroups, filterTags] =
    await Promise.all([
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
      database.scrap.groupBy({
        by: ["courseId"],
        where: {
          createdAt: {
            gte: new Date(now.getTime() - HALL_WINDOW_MILLISECONDS),
            lte: now,
          },
          course: {
            status: "PUBLISHED",
            deletedAt: null,
            OR: [{ coupleId: null }, { couple: { status: "ACTIVE" } }],
          },
        },
        _count: { courseId: true },
        orderBy: { _count: { courseId: "desc" } },
        take: HALL_CANDIDATE_LIMIT,
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

  const weeklyScrapsByCourseId = new Map(
    weeklyScrapGroups.map((group) => [group.courseId, group._count.courseId]),
  );
  const rankedCourseIds = weeklyScrapGroups.map((group) => group.courseId);
  const hallRecords = await database.course.findMany({
    where: rankedCourseIds.length
      ? { id: { in: rankedCourseIds } }
      : {
          status: "PUBLISHED",
          deletedAt: null,
          OR: [{ coupleId: null }, { couple: { status: "ACTIVE" } }],
        },
    orderBy: rankedCourseIds.length
      ? undefined
      : [{ publishedAt: "desc" }, { id: "desc" }],
    take: HALL_CANDIDATE_LIMIT,
    select: courseSelect,
  });
  const hallRecordById = new Map(
    hallRecords.map((course) => [course.id, course]),
  );
  const orderedHallRecords = rankedCourseIds.length
    ? rankedCourseIds.flatMap((id) => {
        const course = hallRecordById.get(id);
        return course ? [course] : [];
      })
    : hallRecords;
  const hallCandidates = orderedHallRecords.map((course) => ({
    ...course,
    weeklyScraps: weeklyScrapsByCourseId.get(course.id) ?? 0,
  }));

  return { happenings, courses, hallCandidates, filterTags };
}

export type HomeFeedRecords = Awaited<ReturnType<typeof selectHomeFeedRecords>>;
