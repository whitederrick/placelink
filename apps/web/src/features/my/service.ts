import type { Actor } from "../../lib/auth/actor";
import { AppError, ErrorCode } from "../../lib/errors";
import {
  selectCreatedCourses,
  selectMyProfile,
  selectMyStats,
  selectSavedCourses,
} from "./queries";
import { myOverviewSchema } from "./schema";

const MILLISECONDS_PER_DAY = 86_400_000;

function mapCourse(
  record: Awaited<ReturnType<typeof selectCreatedCourses>>[number],
) {
  return {
    slug: record.slug,
    title: record.title,
    status: record.status,
    durationMinutes: record.durationMinutes,
    stops: record._count.nodes,
    area: record.nodes[0]?.place.areaSlug ?? null,
    updatedAt: record.updatedAt.toISOString(),
    scrapCount: record.scrapCount,
  };
}

export async function loadMyOverview(
  actor: Actor,
  locale: string,
  now = new Date(),
) {
  const profile = await selectMyProfile(actor.id);
  if (!profile)
    throw new AppError(ErrorCode.USER_NOT_FOUND, "Active user not found", 404);
  const membership = profile.coupleMemberships[0];
  const [createdCourses, savedRecords, stats] = await Promise.all([
    selectCreatedCourses(actor.id, membership?.coupleId, locale),
    selectSavedCourses(actor.id, locale),
    selectMyStats(actor.id, membership?.coupleId),
  ]);
  const startedAt = membership?.couple.startedAt ?? null;
  return myOverviewSchema.parse({
    profile: {
      nickname: profile.nickname,
      coupleName: membership?.couple.displayName ?? null,
      memberInitials: membership
        ? membership.couple.members.map(({ user }) => user.nickname.slice(0, 1))
        : [profile.nickname.slice(0, 1)],
      startedAt: startedAt?.toISOString() ?? null,
      daysTogether: startedAt
        ? Math.max(
            0,
            Math.floor(
              (now.getTime() - startedAt.getTime()) / MILLISECONDS_PER_DAY,
            ),
          )
        : null,
    },
    stats,
    createdCourses: createdCourses.map(mapCourse),
    savedCourses: savedRecords.map(({ course }) => mapCourse(course)),
  });
}
