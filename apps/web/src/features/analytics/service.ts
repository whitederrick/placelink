import { getDatabase } from "@placelink/database";
import type { AnalyticsEventRequest } from "./schema";

export async function recordAnalyticsEvent(
  event: AnalyticsEventRequest,
  userId?: string,
) {
  const database = getDatabase();
  let properties: Record<string, string | number | undefined> = {
    ...event.properties,
  };

  if ("courseSlug" in event.properties) {
    const course = await database.course.findUnique({
      where: { slug: event.properties.courseSlug },
      select: { id: true, status: true, deletedAt: true },
    });
    if (!course || course.status !== "PUBLISHED" || course.deletedAt) return;
    properties = { ...properties, courseId: course.id };

    if (event.name === "course.viewed") {
      await database.$transaction([
        database.course.update({
          where: { id: course.id },
          data: { viewCount: { increment: 1 } },
        }),
        database.analyticsEvent.create({
          data: { name: event.name, userId, properties },
        }),
      ]);
      return;
    }
  }

  await database.analyticsEvent.create({
    data: { name: event.name, userId, properties },
  });
}
