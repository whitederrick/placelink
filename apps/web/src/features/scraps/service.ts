import type { Actor } from "../../lib/auth/actor";
import { AppError, ErrorCode } from "../../lib/errors";
import {
  countRecentUserScraps,
  selectCourseScrap,
  selectScrappableCourse,
  setCourseScrap,
} from "./queries";
import { scrapCourseSlugSchema, scrapStatusResponseSchema } from "./schema";

const SCRAP_RATE_WINDOW_MILLISECONDS = 60_000;
const SCRAP_RATE_LIMIT = 30;

async function requireCourse(slug: string) {
  const course = await selectScrappableCourse(
    scrapCourseSlugSchema.parse(slug),
  );
  if (!course)
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "Published course not found",
      404,
    );
  return course;
}

export async function loadScrapStatus(actor: Actor, slug: string) {
  const course = await requireCourse(slug);
  const scrap = await selectCourseScrap(actor.id, course.id);
  return scrapStatusResponseSchema.parse({
    data: { scrapped: Boolean(scrap), scrapCount: course.scrapCount },
  });
}

export async function addCourseScrap(
  actor: Actor,
  slug: string,
  now = new Date(),
) {
  const course = await requireCourse(slug);
  const existing = await selectCourseScrap(actor.id, course.id);
  if (!existing) {
    const recent = await countRecentUserScraps(
      actor.id,
      new Date(now.getTime() - SCRAP_RATE_WINDOW_MILLISECONDS),
    );
    if (recent >= SCRAP_RATE_LIMIT)
      throw new AppError(
        ErrorCode.COURSE_RATE_LIMITED,
        "Scrap request limit exceeded",
        429,
      );
  }
  return scrapStatusResponseSchema.parse({
    data: await setCourseScrap(actor.id, course.id, true),
  });
}

export async function removeCourseScrap(actor: Actor, slug: string) {
  const course = await requireCourse(slug);
  return scrapStatusResponseSchema.parse({
    data: await setCourseScrap(actor.id, course.id, false),
  });
}
