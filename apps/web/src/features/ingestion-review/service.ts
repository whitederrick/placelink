import { createHash } from "node:crypto";
import { normalizedCulturalEventSchema } from "@placelink/database";
import type { Actor } from "../../lib/auth/actor";
import { AppError, ErrorCode } from "../../lib/errors";
import {
  mergeIngestionTransaction,
  rejectIngestionTransaction,
  selectIngestionForReview,
  selectIngestionsForReview,
} from "./queries";
import {
  ingestionListQuerySchema,
  ingestionListResponseSchema,
  ingestionReviewRequestSchema,
  ingestionReviewResponseSchema,
  type IngestionReviewRequest,
} from "./schema";

function assertAdmin(actor: Actor) {
  if (actor.role !== "ADMIN")
    throw new AppError(ErrorCode.FORBIDDEN, "Admin permission required", 403);
}

function venueExternalId(
  provider: string,
  placeName: string,
  latitude: number | null,
  longitude: number | null,
) {
  return `venue-${createHash("sha256")
    .update(`${provider}\u0000${placeName}\u0000${latitude}\u0000${longitude}`)
    .digest("hex")
    .slice(0, 24)}`;
}

function happeningCanonicalId(provider: string, externalId: string) {
  const digest = createHash("sha256")
    .update(`${provider}\u0000${externalId}`)
    .digest("hex")
    .slice(0, 24);
  return `external-happening-${digest}`;
}

function legacyCategory(placeKind: string) {
  switch (placeKind) {
    case "CAFE":
    case "RESTAURANT":
    case "BAR":
    case "SHOP":
    case "ACTIVITY":
      return placeKind;
    case "GALLERY":
    case "MUSEUM":
    case "CULTURAL_VENUE":
      return "EXHIBITION";
    default:
      return "ACTIVITY";
  }
}

function happeningStatus(startsAt: string, endsAt: string, now: Date) {
  if (new Date(startsAt) > now) return "UPCOMING" as const;
  if (new Date(endsAt) <= now) return "ENDED" as const;
  return "ACTIVE" as const;
}

export async function listIngestionsForReview(
  actor: Actor,
  rawQuery: unknown = {},
) {
  assertAdmin(actor);
  const query = ingestionListQuerySchema.parse(rawQuery);
  const { records, nextCursor } = await selectIngestionsForReview(query);
  return ingestionListResponseSchema.parse({
    data: records.map((record) => {
      const parsed = normalizedCulturalEventSchema.safeParse(
        record.normalizedPayload,
      );
      const event = parsed.success ? parsed.data : null;
      return {
        id: record.id,
        provider: record.provider,
        externalId: record.externalId,
        status: record.status,
        title: event?.title ?? null,
        placeName: event?.placeName ?? null,
        placeKind: event?.placeKind ?? null,
        happeningKind: event?.happeningKind ?? null,
        operatorType: event?.operatorType ?? null,
        district: event?.district ?? null,
        startsAt: event?.startsAt ?? null,
        endsAt: event?.endsAt ?? null,
        scheduleText: event?.scheduleText ?? null,
        officialUrl: event?.officialUrl ?? record.sourceUrl,
        bookingUrl: event?.bookingUrl ?? null,
        errorMessage: record.errorMessage ?? null,
        fetchedAt: record.fetchedAt.toISOString(),
      };
    }),
    meta: { nextCursor },
  });
}

export async function reviewIngestion(
  actor: Actor,
  ingestionId: string,
  rawInput: IngestionReviewRequest,
  now = new Date(),
) {
  assertAdmin(actor);
  const input = ingestionReviewRequestSchema.parse(rawInput);
  const record = await selectIngestionForReview(ingestionId);
  if (!record)
    throw new AppError(
      ErrorCode.INGESTION_NOT_FOUND,
      "Ingestion record not found",
      404,
    );
  if (record.status !== "NORMALIZED")
    throw new AppError(
      ErrorCode.INGESTION_CONFLICT,
      "Ingestion record was already reviewed",
      409,
    );

  if (input.decision === "REJECT") {
    const rejected = await rejectIngestionTransaction(
      actor,
      ingestionId,
      input.reason,
    );
    if (!rejected)
      throw new AppError(
        ErrorCode.INGESTION_CONFLICT,
        "Ingestion record was already reviewed",
        409,
      );
    return ingestionReviewResponseSchema.parse({
      data: { id: ingestionId, status: "REJECTED" },
    });
  }

  const event = normalizedCulturalEventSchema.parse(record.normalizedPayload);
  if (
    !input.existingPlaceId &&
    (event.latitude === null || event.longitude === null)
  )
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "A place must be selected when coordinates are unavailable",
      400,
    );

  const placeKind = input.placeKind ?? event.placeKind;
  const result = await mergeIngestionTransaction(actor, ingestionId, {
    event,
    existingPlaceId: input.existingPlaceId,
    venueExternalId: venueExternalId(
      event.provider,
      event.placeName,
      event.latitude,
      event.longitude,
    ),
    happeningCanonicalId: happeningCanonicalId(
      event.provider,
      event.externalId,
    ),
    placeKind,
    happeningKind: input.happeningKind ?? event.happeningKind,
    operatorType: input.operatorType ?? event.operatorType,
    category: legacyCategory(placeKind),
    status: happeningStatus(event.startsAt, event.endsAt, now),
    now,
  });

  if (result.outcome === "not-found")
    throw new AppError(
      ErrorCode.INGESTION_NOT_FOUND,
      "Ingestion record not found",
      404,
    );
  if (result.outcome !== "merged")
    throw new AppError(
      ErrorCode.INGESTION_CONFLICT,
      result.outcome === "place-not-found"
        ? "Selected place was not found"
        : "Ingestion record conflicts with existing provenance",
      409,
    );

  return ingestionReviewResponseSchema.parse({
    data: {
      id: ingestionId,
      status: "MERGED",
      placeId: result.placeId,
      happeningId: result.happeningId,
    },
  });
}
