import { getDatabase } from "@placelink/database";

export async function selectScrappableCourse(slug: string) {
  return getDatabase().course.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: { id: true, scrapCount: true },
  });
}

export async function selectCourseScrap(userId: string, courseId: string) {
  return getDatabase().scrap.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
}

export async function countRecentUserScraps(userId: string, since: Date) {
  return getDatabase().scrap.count({
    where: { userId, createdAt: { gte: since } },
  });
}

export async function setCourseScrap(
  userId: string,
  courseId: string,
  shouldScrap: boolean,
) {
  const database = getDatabase();
  return database.$transaction(async (transaction) => {
    let changed = false;
    if (shouldScrap) {
      const inserted = await transaction.scrap.createMany({ data: [{ userId, courseId }], skipDuplicates: true });
      changed = inserted.count === 1;
    } else {
      const removed = await transaction.scrap.deleteMany({ where: { userId, courseId } });
      changed = removed.count > 0;
    }
    const scrapCount = await transaction.scrap.count({ where: { courseId } });
    await transaction.course.update({
      where: { id: courseId },
      data: { scrapCount },
    });
    if (changed) {
      await transaction.analyticsEvent.create({
        data: {
          userId,
          name: shouldScrap ? "course.scrapped" : "course.unscrapped",
          properties: { courseId },
        },
      });
    }
    return { scrapped: shouldScrap ? true : false, scrapCount };
  });
}
