import { getDatabase } from "@placelink/database";

export async function selectMyProfile(userId: string) {
  return getDatabase().user.findFirst({
    where: { id: userId, status: "ACTIVE" },
    select: {
      id: true,
      nickname: true,
      coupleMemberships: {
        where: { leftAt: null, couple: { status: "ACTIVE" } },
        take: 1,
        select: {
          coupleId: true,
          couple: {
            select: {
              displayName: true,
              startedAt: true,
              members: {
                where: { leftAt: null },
                take: 2,
                orderBy: { joinedAt: "asc" },
                select: { user: { select: { nickname: true } } },
              },
            },
          },
        },
      },
    },
  });
}

const courseCardSelect = (locale: string) => ({
  slug: true,
  title: true,
  status: true,
  durationMinutes: true,
  updatedAt: true,
  scrapCount: true,
  nodes: {
    orderBy: { orderIndex: "asc" as const },
    take: 1,
    select: {
      place: {
        select: {
          areaSlug: true,
          translations: { where: { locale }, take: 1, select: { name: true } },
        },
      },
    },
  },
  _count: { select: { nodes: true } },
});

export async function selectCreatedCourses(
  userId: string,
  coupleId: string | undefined,
  locale: string,
) {
  const owner = coupleId
    ? { OR: [{ creatorUserId: userId }, { coupleId }] }
    : { creatorUserId: userId };
  return getDatabase().course.findMany({
    where: {
      ...owner,
      status: { in: ["DRAFT", "PUBLISHED", "PRIVATE"] },
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: courseCardSelect(locale),
  });
}

export async function selectSavedCourses(userId: string, locale: string) {
  return getDatabase().scrap.findMany({
    where: { userId, course: { status: "PUBLISHED", deletedAt: null } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { course: { select: courseCardSelect(locale) } },
  });
}

export async function selectMyStats(
  userId: string,
  coupleId: string | undefined,
) {
  const owner = coupleId
    ? { OR: [{ creatorUserId: userId }, { coupleId }] }
    : { creatorUserId: userId };
  const database = getDatabase();
  const [made, saved, received] = await Promise.all([
    database.course.count({
      where: { ...owner, status: { not: "DELETED" }, deletedAt: null },
    }),
    database.scrap.count({
      where: { userId, course: { status: "PUBLISHED", deletedAt: null } },
    }),
    database.course.aggregate({
      where: { ...owner, status: "PUBLISHED", deletedAt: null },
      _sum: { scrapCount: true },
    }),
  ]);
  return { made, saved, received: received._sum.scrapCount ?? 0 };
}
