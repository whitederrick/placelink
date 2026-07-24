import { getDatabase } from "@placelink/database";
import type { HomeFeedLocale, HomeFeedQuery } from "./schema";

const ANCHOR_LIMIT = 10;

export async function selectHomeFeedRecords(
  locale: HomeFeedLocale,
  pagination: Pick<HomeFeedQuery, "cursor" | "take">
) {
  const database = getDatabase();
  const [happenings, courses] = await Promise.all([
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
          select: { title: true }
        },
        place: {
          select: {
            translations: {
              where: { locale },
              take: 1,
              select: { name: true }
            }
          }
        }
      }
    }),
    database.course.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: pagination.take + 1,
      cursor: pagination.cursor ? { slug: pagination.cursor } : undefined,
      skip: pagination.cursor ? 1 : 0,
      select: {
        slug: true,
        durationMinutes: true,
        couple: { select: { displayName: true, status: true } },
        creatorUser: { select: { nickname: true } },
        nodes: {
          orderBy: { orderIndex: "asc" },
          take: 1,
          select: {
            place: {
              select: {
                translations: {
                  where: { locale },
                  take: 1,
                  select: { name: true }
                }
              }
            }
          }
        },
        tags: {
          take: 3,
          select: {
            tag: { select: { labelKo: true, labelEn: true } }
          }
        },
        _count: { select: { nodes: true, scraps: true } }
      }
    })
  ]);

  return { happenings, courses };
}

export type HomeFeedRecords = Awaited<ReturnType<typeof selectHomeFeedRecords>>;
