import { getDatabase } from "@placelink/database";
import type { Actor } from "../../lib/auth/actor";
import type { AnchorListQuery, CreateCourseDraftRequest } from "./schema";

export async function selectCourseAnchorRecords(
  query: AnchorListQuery,
  now: Date,
) {
  return getDatabase().happening.findMany({
    where: {
      isAnchor: true,
      status: { in: ["UPCOMING", "ACTIVE"] },
      endsAt: { gt: now },
    },
    orderBy: [{ endsAt: "asc" }, { id: "asc" }],
    cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0,
    take: query.take + 1,
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      translations: {
        where: { locale: query.locale },
        take: 1,
        select: { title: true },
      },
      place: {
        select: {
          id: true,
          areaSlug: true,
          lat: true,
          lng: true,
          translations: {
            where: { locale: query.locale },
            take: 1,
            select: { name: true, address: true },
          },
        },
      },
    },
  });
}

export async function selectCourseOwner(actor: Actor) {
  return getDatabase().user.findUnique({
    where: { id: actor.id },
    select: {
      id: true,
      status: true,
      coupleMemberships: {
        where: { leftAt: null, couple: { status: "ACTIVE" } },
        take: 1,
        select: { coupleId: true },
      },
    },
  });
}

export async function selectCourseAnchorById(
  happeningId: string,
  locale: string,
  now: Date,
) {
  return getDatabase().happening.findFirst({
    where: {
      id: happeningId,
      isAnchor: true,
      status: { in: ["UPCOMING", "ACTIVE"] },
      endsAt: { gt: now },
    },
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      translations: { where: { locale }, take: 1, select: { title: true } },
      place: {
        select: {
          id: true,
          areaSlug: true,
          lat: true,
          lng: true,
          translations: {
            where: { locale },
            take: 1,
            select: { name: true, address: true },
          },
        },
      },
    },
  });
}

export async function countRecentDrafts(
  owner: { creatorUserId?: string; coupleId?: string },
  since: Date,
) {
  return getDatabase().course.count({
    where: {
      status: "DRAFT",
      deletedAt: null,
      createdAt: { gte: since },
      ...owner,
    },
  });
}

export async function insertCourseDraft(
  owner: { creatorUserId?: string; coupleId?: string },
  anchor: CourseAnchorRecord,
  input: CreateCourseDraftRequest,
  slug: string,
) {
  const translatedTitle = anchor.translations[0]?.title ?? anchor.id;
  const title =
    input.locale === "ko"
      ? `${translatedTitle} 데이트`
      : `${translatedTitle} date`;
  return getDatabase().course.create({
    data: {
      ...owner,
      slug,
      status: "DRAFT",
      sourceType: "UGC",
      title,
      nodes: { create: { placeId: anchor.place.id, orderIndex: 0 } },
    },
    select: { id: true, slug: true, status: true, title: true },
  });
}

export async function selectDraftCourse(
  slug: string,
  actor: Actor,
  locale: string,
) {
  return getDatabase().course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      status: true,
      title: true,
      dayCount: true,
      dayStartMinutes: true,
      dayEndMinutes: true,
      targetStopCount: true,
      creatorUserId: true,
      creatorUser: { select: { nickname: true } },
      couple: {
        select: {
          displayName: true,
          status: true,
          members: {
            where: { userId: actor.id, leftAt: null },
            take: 1,
            select: { userId: true },
          },
        },
      },
      nodes: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          orderIndex: true,
          dayIndex: true,
          durationMinutes: true,
          tip: true,
          distanceMeters: true,
          place: {
            select: {
              id: true,
              areaSlug: true,
              category: true,
              lat: true,
              lng: true,
              status: true,
              translations: {
                where: { locale },
                take: 1,
                select: { name: true, address: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function selectRoutePlaces(placeIds: string[], locale: string) {
  return getDatabase().place.findMany({
    where: { id: { in: placeIds }, status: "ACTIVE" },
    select: {
      id: true,
      areaSlug: true,
      category: true,
      lat: true,
      lng: true,
      translations: {
        where: { locale },
        take: 1,
        select: { name: true, address: true },
      },
    },
  });
}

export async function replaceDraftNodes(
  courseId: string,
  schedule: {
    dayCount: number;
    dayStartMinutes: number;
    dayEndMinutes: number;
    targetStopCount: number;
  },
  nodes: Array<{
    id: string;
    placeId: string;
    orderIndex: number;
    dayIndex: number;
    durationMinutes: number;
    tip: string | null;
    distanceMeters: number | null;
  }>,
) {
  const database = getDatabase();
  return database.$transaction(async (transaction) => {
    const updated = await transaction.course.updateMany({
      where: { id: courseId, status: "DRAFT", deletedAt: null },
      data: { ...schedule, updatedAt: new Date() },
    });
    if (updated.count !== 1) return false;
    await transaction.courseNode.deleteMany({ where: { courseId } });
    await transaction.courseNode.createMany({
      data: nodes.map((node) => ({ ...node, courseId })),
    });
    return true;
  });
}

export async function publishDraftCourse(
  courseId: string,
  data: { title: string; description: string | null; durationMinutes: number },
  publishedAt: Date,
) {
  const database = getDatabase();
  return database.$transaction(async (transaction) => {
    const updated = await transaction.course.updateMany({
      where: { id: courseId, status: "DRAFT", deletedAt: null },
      data: { ...data, status: "PUBLISHED", publishedAt },
    });
    if (updated.count !== 1) return null;
    return transaction.course.findUnique({
      where: { id: courseId },
      select: { slug: true, status: true, publishedAt: true },
    });
  });
}

export async function selectPublishedCourse(slug: string, locale: string) {
  return getDatabase().course.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: {
      slug: true,
      title: true,
      description: true,
      durationMinutes: true,
      dayCount: true,
      dayStartMinutes: true,
      dayEndMinutes: true,
      targetStopCount: true,
      scrapCount: true,
      publishedAt: true,
      couple: { select: { displayName: true, status: true } },
      creatorUser: { select: { nickname: true } },
      tags: {
        take: 3,
        select: { tag: { select: { labelKo: true, labelEn: true } } },
      },
      nodes: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          orderIndex: true,
          dayIndex: true,
          durationMinutes: true,
          tip: true,
          distanceMeters: true,
          place: {
            select: {
              id: true,
              areaSlug: true,
              category: true,
              lat: true,
              lng: true,
              translations: {
                where: { locale },
                take: 1,
                select: { name: true, address: true },
              },
              happenings: {
                where: { isAnchor: true },
                orderBy: { endsAt: "desc" },
                take: 1,
                select: { status: true, startsAt: true, endsAt: true },
              },
            },
          },
        },
      },
    },
  });
}

export type CourseAnchorRecord = Awaited<
  ReturnType<typeof selectCourseAnchorRecords>
>[number];
export type DraftCourseRecord = NonNullable<
  Awaited<ReturnType<typeof selectDraftCourse>>
>;
export type RoutePlaceRecord = Awaited<
  ReturnType<typeof selectRoutePlaces>
>[number];
export type PublishedCourseRecord = NonNullable<
  Awaited<ReturnType<typeof selectPublishedCourse>>
>;
