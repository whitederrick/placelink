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
  return {
    id: record.id,
    slug: record.slug,
    status: "DRAFT",
    title: record.title,
    ownerName: resolveOwnerName(record, locale),
    nodes: record.nodes.map((node) => ({
      id: node.id,
      orderIndex: node.orderIndex,
      tip: node.tip,
      distanceMeters: node.distanceMeters,
      walkMinutes:
        node.distanceMeters === null
          ? null
          : Math.max(
              1,
              Math.ceil(node.distanceMeters / WALKING_METERS_PER_MINUTE),
            ),
      place: {
        id: node.place.id,
        name: node.place.translations[0]?.name ?? node.place.id,
        address: node.place.translations[0]?.address ?? "",
        area: node.place.areaSlug,
        category: node.place.category,
        lat: Number(node.place.lat),
        lng: Number(node.place.lng),
      },
    })),
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
  const persistedNodes = input.nodes.map((node, index) => ({
    id: randomUUID(),
    placeId: node.placeId,
    orderIndex: index,
    tip: node.tip?.trim() || null,
    distanceMeters:
      index === 0
        ? null
        : distanceMeters(
            byId.get(input.nodes[index - 1]!.placeId)!,
            byId.get(node.placeId)!,
          ),
  }));
  await replaceDraftNodes(existing.id, persistedNodes);
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
  if (existing.nodes.some((node) => node.place.status !== "ACTIVE"))
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "A course contains an unavailable place",
      400,
    );
  const walkingMinutes = existing.nodes.reduce(
    (total, node) =>
      total +
      (node.distanceMeters === null
        ? 0
        : Math.max(
            1,
            Math.ceil(node.distanceMeters / WALKING_METERS_PER_MINUTE),
          )),
    0,
  );
  const durationMinutes = existing.nodes.length * 60 + walkingMinutes;
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
  return publicCourseSchema.parse({
    slug: record.slug,
    title: record.title,
    description: record.description,
    ownerName,
    durationMinutes: record.durationMinutes ?? record.nodes.length * 60,
    scrapCount: record.scrapCount,
    publishedAt: record.publishedAt?.toISOString(),
    tags: record.tags.map(({ tag }) =>
      locale === "ko" ? tag.labelKo : tag.labelEn,
    ),
    nodes: record.nodes.map((node) => ({
      id: node.id,
      orderIndex: node.orderIndex,
      tip: node.tip,
      distanceMeters: node.distanceMeters,
      walkMinutes:
        node.distanceMeters === null
          ? null
          : Math.max(
              1,
              Math.ceil(node.distanceMeters / WALKING_METERS_PER_MINUTE),
            ),
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
    })),
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
