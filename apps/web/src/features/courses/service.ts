import { randomUUID } from "node:crypto";
import { AppError, ErrorCode } from "../../lib/errors";
import type { Actor } from "../../lib/auth/actor";
import {
  anchorListResponseSchema,
  courseAnchorSchema,
  createCourseDraftRequestSchema,
  createCourseDraftResponseSchema,
  courseDraftResponseSchema,
  publishCourseRequestSchema,
  publishCourseResponseSchema,
  publicCourseSchema,
  updateCourseDraftRequestSchema,
  updateCourseDraftResponseSchema,
  type AnchorListQuery,
  type CourseAnchor,
  type CourseDraft,
  type CreateCourseDraftRequest,
  type PublishCourseRequest,
  type UpdateCourseDraftRequest,
} from "./schema";
import {
  countRecentDrafts,
  insertCourseDraft,
  publishDraftCourse,
  replaceDraftNodes,
  selectCourseAnchorById,
  selectCourseAnchorRecords,
  selectCourseOwner,
  selectDraftCourse,
  selectPublishedCourse,
  selectRoutePlaces,
  type CourseAnchorRecord,
  type DraftCourseRecord,
  type PublishedCourseRecord,
  type RoutePlaceRecord,
} from "./queries";

const MILLISECONDS_PER_DAY = 86_400_000;
const DRAFT_RATE_WINDOW_MILLISECONDS = 10 * 60 * 1000;
const DRAFT_RATE_LIMIT = 10;
const WALKING_METERS_PER_MINUTE = 80;

function walkingMinutes(distanceMeters: number | null) {
  return distanceMeters === null
    ? null
    : Math.max(1, Math.ceil(distanceMeters / WALKING_METERS_PER_MINUTE));
}

function shortDate(date: Date) {
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}.${String(date.getUTCDate()).padStart(2, "0")}`;
}

function mapAnchor(record: CourseAnchorRecord, now: Date): CourseAnchor {
  const remainingDays = Math.max(
    0,
    Math.ceil((record.endsAt.getTime() - now.getTime()) / MILLISECONDS_PER_DAY),
  );
  return courseAnchorSchema.parse({
    happeningId: record.id,
    title: record.translations[0]?.title ?? record.id,
    period: `${shortDate(record.startsAt)}–${shortDate(record.endsAt)}`,
    dDay:
      record.status === "UPCOMING"
        ? `${shortDate(record.startsAt)} OPEN`
        : `D-${remainingDays}`,
    place: {
      id: record.place.id,
      name: record.place.translations[0]?.name ?? record.place.id,
      address: record.place.translations[0]?.address ?? "",
      area: record.place.areaSlug,
      lat: Number(record.place.lat),
      lng: Number(record.place.lng),
    },
  });
}

export async function listCourseAnchors(
  query: AnchorListQuery,
  now = new Date(),
) {
  const records = await selectCourseAnchorRecords(query, now);
  const hasNextPage = records.length > query.take;
  const visible = records.slice(0, query.take);
  return anchorListResponseSchema.parse({
    data: visible.map((record) => mapAnchor(record, now)),
    meta: { nextCursor: hasNextPage ? visible.at(-1)?.id : undefined },
  });
}

export async function createCourseDraft(
  actor: Actor,
  rawInput: CreateCourseDraftRequest,
  now = new Date(),
) {
  const input = createCourseDraftRequestSchema.parse(rawInput);
  const [ownerRecord, anchorRecord] = await Promise.all([
    selectCourseOwner(actor),
    selectCourseAnchorById(input.anchorHappeningId, input.locale, now),
  ]);
  if (!ownerRecord || ownerRecord.status !== "ACTIVE")
    throw new AppError(ErrorCode.USER_NOT_FOUND, "Active user not found", 404);
  if (!anchorRecord)
    throw new AppError(
      ErrorCode.ANCHOR_NOT_FOUND,
      "Active anchor not found",
      404,
    );
  const owner = ownerRecord.coupleMemberships[0]
    ? { coupleId: ownerRecord.coupleMemberships[0].coupleId }
    : { creatorUserId: ownerRecord.id };
  const recentDrafts = await countRecentDrafts(
    owner,
    new Date(now.getTime() - DRAFT_RATE_WINDOW_MILLISECONDS),
  );
  if (recentDrafts >= DRAFT_RATE_LIMIT)
    throw new AppError(
      ErrorCode.COURSE_RATE_LIMITED,
      "Course creation limit exceeded",
      429,
    );
  const course = await insertCourseDraft(
    owner,
    anchorRecord,
    input,
    `course-${randomUUID()}`,
  );
  return createCourseDraftResponseSchema.parse({
    data: { ...course, anchor: mapAnchor(anchorRecord, now) },
  });
}

function canEditDraft(record: DraftCourseRecord, actor: Actor) {
  return (
    record.creatorUserId === actor.id || Boolean(record.couple?.members[0])
  );
}

function distanceMeters(first: RoutePlaceRecord, second: RoutePlaceRecord) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(Number(second.lat) - Number(first.lat));
  const longitudeDelta = radians(Number(second.lng) - Number(first.lng));
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(Number(first.lat))) *
      Math.cos(radians(Number(second.lat))) *
      Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function resolveOwnerName(
  record: Pick<DraftCourseRecord, "couple" | "creatorUser">,
  locale: string,
) {
  if (record.couple?.status === "ACTIVE") return record.couple.displayName;
  return record.creatorUser?.nickname ?? (locale === "ko" ? "우리" : "Our");
}

function mapDraft(record: DraftCourseRecord, locale: string): CourseDraft {
  const elapsedByDay = new Map<number, number>();
  return {
    id: record.id,
    slug: record.slug,
    status: "DRAFT",
    title: record.title,
    ownerName: resolveOwnerName(record, locale),
    dayCount: record.dayCount,
    dayStartMinutes: record.dayStartMinutes,
    dayEndMinutes: record.dayEndMinutes,
    targetStopCount: record.targetStopCount,
    nodes: record.nodes.map((node) => {
      const dayIndex = node.dayIndex;
      const walkMinutes = walkingMinutes(node.distanceMeters);
      const arrivalMinutes =
        (elapsedByDay.get(dayIndex) ?? record.dayStartMinutes) +
        (elapsedByDay.has(dayIndex) ? (walkMinutes ?? 0) : 0);
      const durationMinutes = node.durationMinutes ?? 60;
      elapsedByDay.set(dayIndex, arrivalMinutes + durationMinutes);
      return {
        id: node.id,
        orderIndex: node.orderIndex,
        dayIndex,
        durationMinutes,
        arrivalMinutes,
        tip: node.tip,
        distanceMeters: node.distanceMeters,
        walkMinutes,
        place: {
          id: node.place.id,
          name: node.place.translations[0]?.name ?? node.place.id,
          address: node.place.translations[0]?.address ?? "",
          area: node.place.areaSlug,
          category: node.place.category,
          lat: Number(node.place.lat),
          lng: Number(node.place.lng),
        },
      };
    }),
  };
}

export async function loadCourseDraft(
  actor: Actor,
  slug: string,
  locale: string,
) {
  const record = await selectDraftCourse(slug, actor, locale);
  if (!record || record.status !== "DRAFT" || !canEditDraft(record, actor))
    throw new AppError(ErrorCode.FORBIDDEN, "Draft access denied", 403);
  return courseDraftResponseSchema.parse({ data: mapDraft(record, locale) });
}

export async function updateCourseDraft(
  actor: Actor,
  slug: string,
  locale: string,
  rawInput: UpdateCourseDraftRequest,
) {
  const input = updateCourseDraftRequestSchema.parse(rawInput);
  const existing = await selectDraftCourse(slug, actor, locale);
  if (
    !existing ||
    existing.status !== "DRAFT" ||
    !canEditDraft(existing, actor)
  )
    throw new AppError(ErrorCode.FORBIDDEN, "Draft access denied", 403);
  if (input.nodes[0]?.placeId !== existing.nodes[0]?.place.id)
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "Anchor must remain the first stop",
      400,
    );
  if (input.nodes[0]?.dayIndex !== 1)
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "Anchor must remain on day one",
      400,
    );
  const places = await selectRoutePlaces(
    input.nodes.map((node) => node.placeId),
    locale,
  );
  if (places.length !== input.nodes.length)
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "One or more places are unavailable",
      400,
    );
  const byId = new Map(places.map((place) => [place.id, place]));
  const orderedNodes = input.nodes
    .map((node, inputIndex) => ({ ...node, inputIndex }))
    .sort(
      (first, second) =>
        first.dayIndex - second.dayIndex ||
        first.inputIndex - second.inputIndex,
    );
  const elapsedByDay = new Map<number, number>();
  const persistedNodes = orderedNodes.map((node, index) => {
    const previous = orderedNodes[index - 1];
    const distance =
      previous?.dayIndex === node.dayIndex
        ? distanceMeters(byId.get(previous.placeId)!, byId.get(node.placeId)!)
        : null;
    const arrivalMinutes =
      (elapsedByDay.get(node.dayIndex) ?? input.dayStartMinutes) +
      (elapsedByDay.has(node.dayIndex) ? (walkingMinutes(distance) ?? 0) : 0);
    elapsedByDay.set(node.dayIndex, arrivalMinutes + node.durationMinutes);
    return {
      id: randomUUID(),
      placeId: node.placeId,
      orderIndex: index,
      dayIndex: node.dayIndex,
      durationMinutes: node.durationMinutes,
      tip: node.tip?.trim() || null,
      distanceMeters: distance,
    };
  });
  if (
    [...elapsedByDay.values()].some((minutes) => minutes > input.dayEndMinutes)
  )
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "One or more days exceed the selected end time",
      400,
    );
  const replaced = await replaceDraftNodes(
    existing.id,
    {
      dayCount: input.dayCount,
      dayStartMinutes: input.dayStartMinutes,
      dayEndMinutes: input.dayEndMinutes,
      targetStopCount: input.targetStopCount,
    },
    persistedNodes,
  );
  if (!replaced)
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "Draft is no longer editable",
      409,
    );
  const updated = await selectDraftCourse(slug, actor, locale);
  if (!updated)
    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      "Updated draft not found",
      500,
    );
  return updateCourseDraftResponseSchema.parse({
    data: mapDraft(updated, locale),
  });
}

export async function publishCourseDraft(
  actor: Actor,
  slug: string,
  locale: string,
  rawInput: PublishCourseRequest,
  now = new Date(),
) {
  const input = publishCourseRequestSchema.parse(rawInput);
  const existing = await selectDraftCourse(slug, actor, locale);
  if (
    !existing ||
    existing.status !== "DRAFT" ||
    !canEditDraft(existing, actor)
  )
    throw new AppError(ErrorCode.FORBIDDEN, "Draft access denied", 403);
  if (existing.nodes.length < 2)
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "A published course requires at least two stops",
      400,
    );
  for (let dayIndex = 1; dayIndex <= existing.dayCount; dayIndex += 1) {
    if (!existing.nodes.some((node) => node.dayIndex === dayIndex))
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        "Every selected day requires at least one stop",
        400,
      );
  }
  if (existing.nodes.some((node) => node.place.status !== "ACTIVE"))
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "A course contains an unavailable place",
      400,
    );
  const totalWalkingMinutes = existing.nodes.reduce(
    (total, node) => total + (walkingMinutes(node.distanceMeters) ?? 0),
    0,
  );
  const durationMinutes =
    existing.nodes.reduce(
      (total, node) => total + (node.durationMinutes ?? 60),
      0,
    ) + totalWalkingMinutes;
  const published = await publishDraftCourse(
    existing.id,
    {
      title: input.title,
      description: input.description?.trim() || null,
      durationMinutes,
    },
    now,
  );
  if (!published?.publishedAt || published.status !== "PUBLISHED")
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "Draft was already published",
      409,
    );
  return publishCourseResponseSchema.parse({
    data: {
      slug: published.slug,
      status: published.status,
      publishedAt: published.publishedAt.toISOString(),
    },
  });
}

function mapPublishedCourse(record: PublishedCourseRecord, locale: string) {
  const ownerName =
    record.couple?.status === "ACTIVE"
      ? record.couple.displayName
      : (record.creatorUser?.nickname ??
        (locale === "ko" ? "익명" : "Anonymous"));
  const elapsedByDay = new Map<number, number>();
  return publicCourseSchema.parse({
    slug: record.slug,
    title: record.title,
    description: record.description,
    ownerName,
    durationMinutes: record.durationMinutes ?? record.nodes.length * 60,
    dayCount: record.dayCount,
    dayStartMinutes: record.dayStartMinutes,
    dayEndMinutes: record.dayEndMinutes,
    targetStopCount: record.targetStopCount,
    scrapCount: record.scrapCount,
    publishedAt: record.publishedAt?.toISOString(),
    tags: record.tags.map(({ tag }) =>
      locale === "ko" ? tag.labelKo : tag.labelEn,
    ),
    nodes: record.nodes.map((node) => {
      const walkMinutes = walkingMinutes(node.distanceMeters);
      const arrivalMinutes =
        (elapsedByDay.get(node.dayIndex) ?? record.dayStartMinutes) +
        (elapsedByDay.has(node.dayIndex) ? (walkMinutes ?? 0) : 0);
      const durationMinutes = node.durationMinutes ?? 60;
      elapsedByDay.set(node.dayIndex, arrivalMinutes + durationMinutes);
      return {
        id: node.id,
        orderIndex: node.orderIndex,
        dayIndex: node.dayIndex,
        durationMinutes,
        arrivalMinutes,
        tip: node.tip,
        distanceMeters: node.distanceMeters,
        walkMinutes,
        happening: node.place.happenings[0]
          ? {
              status: node.place.happenings[0].status,
              startsAt: node.place.happenings[0].startsAt.toISOString(),
              endsAt: node.place.happenings[0].endsAt.toISOString(),
            }
          : null,
        place: {
          id: node.place.id,
          name: node.place.translations[0]?.name ?? node.place.id,
          address: node.place.translations[0]?.address ?? "",
          area: node.place.areaSlug,
          category: node.place.category,
          lat: Number(node.place.lat),
          lng: Number(node.place.lng),
        },
      };
    }),
  });
}

export async function loadPublishedCourse(slug: string, locale: string) {
  const record = await selectPublishedCourse(slug, locale);
  if (!record?.publishedAt)
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "Published course not found",
      404,
    );
  return mapPublishedCourse(record, locale);
}
