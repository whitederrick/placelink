import {
  getDatabase,
  type HappeningKind,
  type NormalizedCulturalEvent,
  type PlaceKind,
  type VenueOperatorType,
} from "@placelink/database";
import type { Actor } from "../../lib/auth/actor";
import type { IngestionListQuery } from "./schema";

interface StageIngestionBatch {
  provider: "SEOUL_OPEN_DATA" | "CULTURE_PORTAL";
  totalAvailable: number;
  fetched: number;
  records: Array<{
    externalId: string;
    checksum: string;
    sourceUrl: string | null;
    rawPayload: unknown;
    normalizedPayload: unknown;
  }>;
}

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export async function createIngestionRun(
  actor: Actor,
  provider: "SEOUL_OPEN_DATA" | "CULTURE_PORTAL",
  request: unknown,
  startedAt: Date,
) {
  return getDatabase().ingestionRun.create({
    data: {
      provider,
      status: "RUNNING",
      trigger: actor.type === "AGENT" ? "SCHEDULED" : "MANUAL",
      actorId: actor.id,
      actorType: actor.type,
      requestPayload: toJson(request),
      startedAt,
    },
    select: { id: true },
  });
}

export async function failIngestionRun(
  actor: Actor,
  runId: string,
  errorMessage: string,
  finishedAt: Date,
) {
  return getDatabase().$transaction(async (transaction) => {
    const failed = await transaction.ingestionRun.updateMany({
      where: { id: runId, status: "RUNNING" },
      data: {
        status: "FAILED",
        errorMessage,
        finishedAt,
      },
    });
    if (failed.count !== 1) return false;
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        actorType: actor.type,
        action: "ingestion.run_failed",
        targetType: "IngestionRun",
        targetId: runId,
        before: { status: "RUNNING" },
        after: { status: "FAILED", errorMessage },
      },
    });
    return true;
  });
}

export async function selectIngestionsForReview(query: IngestionListQuery) {
  const records = await getDatabase().ingestionRecord.findMany({
    where: {
      status: query.status,
      provider: query.provider,
      AND: [
        ...(query.happeningKind
          ? [
              {
                normalizedPayload: {
                  path: ["happeningKind"],
                  equals: query.happeningKind,
                },
              },
            ]
          : []),
        ...(query.operatorType
          ? [
              {
                normalizedPayload: {
                  path: ["operatorType"],
                  equals: query.operatorType,
                },
              },
            ]
          : []),
      ],
    },
    orderBy: [{ fetchedAt: "desc" }, { id: "desc" }],
    cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0,
    take: query.take + 1,
    select: {
      id: true,
      provider: true,
      externalId: true,
      status: true,
      normalizedPayload: true,
      sourceUrl: true,
      errorMessage: true,
      fetchedAt: true,
    },
  });
  const hasNext = records.length > query.take;
  const page = hasNext ? records.slice(0, query.take) : records;
  return {
    records: page,
    nextCursor: hasNext ? page.at(-1)?.id : undefined,
  };
}

export async function selectIngestionForReview(id: string) {
  return getDatabase().ingestionRecord.findUnique({
    where: { id },
    select: {
      id: true,
      provider: true,
      externalId: true,
      status: true,
      normalizedPayload: true,
    },
  });
}

interface MergeInput {
  event: NormalizedCulturalEvent;
  existingPlaceId?: string;
  venueExternalId: string;
  happeningCanonicalId: string;
  placeKind: PlaceKind;
  happeningKind: HappeningKind;
  operatorType: VenueOperatorType;
  category: string;
  status: "UPCOMING" | "ACTIVE" | "ENDED";
  now: Date;
}

export async function mergeIngestionTransaction(
  actor: Actor,
  ingestionId: string,
  input: MergeInput,
) {
  const database = getDatabase();
  return database.$transaction(async (transaction) => {
    const [ingestion, eventReference, venueReference, selectedPlace] =
      await Promise.all([
        transaction.ingestionRecord.findUnique({
          where: { id: ingestionId },
          select: { id: true, status: true },
        }),
        transaction.happeningProviderRef.findUnique({
          where: {
            provider_externalId: {
              provider: input.event.provider,
              externalId: input.event.externalId,
            },
          },
          select: { happeningId: true },
        }),
        transaction.placeProviderRef.findUnique({
          where: {
            provider_externalId: {
              provider: input.event.provider,
              externalId: input.venueExternalId,
            },
          },
          select: { placeId: true },
        }),
        input.existingPlaceId
          ? transaction.place.findFirst({
              where: { id: input.existingPlaceId, status: "ACTIVE" },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);

    if (!ingestion) return { outcome: "not-found" as const };
    if (ingestion.status !== "NORMALIZED")
      return { outcome: "conflict" as const };
    if (input.existingPlaceId && !selectedPlace)
      return { outcome: "place-not-found" as const };
    if (
      input.existingPlaceId &&
      venueReference &&
      venueReference.placeId !== input.existingPlaceId
    )
      return { outcome: "venue-conflict" as const };

    const claimed = await transaction.ingestionRecord.updateMany({
      where: { id: ingestionId, status: "NORMALIZED" },
      data: { status: "MERGED", errorMessage: null },
    });
    if (claimed.count !== 1) return { outcome: "conflict" as const };

    let placeId =
      selectedPlace?.id ??
      venueReference?.placeId ??
      `${input.event.provider.toLowerCase().replaceAll("_", "-")}-${input.venueExternalId}`;

    if (!selectedPlace && !venueReference) {
      const place = await transaction.place.create({
        data: {
          id: placeId,
          sourceType: "PUBLIC_API",
          status: "ACTIVE",
          category: input.category,
          kind: input.placeKind,
          operatorType: input.operatorType,
          lat: input.event.latitude!,
          lng: input.event.longitude!,
          websiteUrl: input.event.officialUrl,
          translations: {
            create: {
              locale: "ko",
              name: input.event.placeName,
              address: input.event.district,
            },
          },
          providerRefs: {
            create: {
              provider: input.event.provider,
              externalId: input.venueExternalId,
              sourceUrl: input.event.officialUrl,
            },
          },
        },
        select: { id: true },
      });
      placeId = place.id;
    } else {
      await transaction.place.update({
        where: { id: placeId },
        data: {
          kind: input.placeKind,
          operatorType: input.operatorType,
          websiteUrl: input.event.officialUrl ?? undefined,
        },
      });
      if (!venueReference) {
        await transaction.placeProviderRef.create({
          data: {
            placeId,
            provider: input.event.provider,
            externalId: input.venueExternalId,
            sourceUrl: input.event.officialUrl,
          },
        });
      }
    }

    const description = [input.event.audience, input.event.feeText]
      .filter(Boolean)
      .join(" · ");
    let happeningId = eventReference?.happeningId ?? input.happeningCanonicalId;

    if (eventReference) {
      await transaction.happening.update({
        where: { id: happeningId },
        data: {
          placeId,
          sourceType: "PUBLIC_API",
          status: input.status,
          kind: input.happeningKind,
          startsAt: new Date(input.event.startsAt),
          endsAt: new Date(input.event.endsAt),
          translations: {
            upsert: {
              where: { happeningId_locale: { happeningId, locale: "ko" } },
              create: {
                locale: "ko",
                title: input.event.title,
                description: description || null,
                scheduleText: input.event.scheduleText,
              },
              update: {
                title: input.event.title,
                description: description || null,
                scheduleText: input.event.scheduleText,
              },
            },
          },
          providerRefs: {
            update: {
              where: {
                provider_externalId: {
                  provider: input.event.provider,
                  externalId: input.event.externalId,
                },
              },
              data: {
                sourceUrl: input.event.officialUrl,
                bookingUrl: input.event.bookingUrl,
                lastFetchedAt: input.now,
              },
            },
          },
        },
      });
    } else {
      const happening = await transaction.happening.create({
        data: {
          id: happeningId,
          placeId,
          sourceType: "PUBLIC_API",
          status: input.status,
          kind: input.happeningKind,
          startsAt: new Date(input.event.startsAt),
          endsAt: new Date(input.event.endsAt),
          translations: {
            create: {
              locale: "ko",
              title: input.event.title,
              description: description || null,
              scheduleText: input.event.scheduleText,
            },
          },
          providerRefs: {
            create: {
              provider: input.event.provider,
              externalId: input.event.externalId,
              sourceUrl: input.event.officialUrl,
              bookingUrl: input.event.bookingUrl,
              lastFetchedAt: input.now,
            },
          },
        },
        select: { id: true },
      });
      happeningId = happening.id;
    }

    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        actorType: actor.type,
        action: "ingestion.merged",
        targetType: "IngestionRecord",
        targetId: ingestionId,
        before: { status: "NORMALIZED" },
        after: {
          status: "MERGED",
          placeId,
          happeningId,
          placeKind: input.placeKind,
          happeningKind: input.happeningKind,
          operatorType: input.operatorType,
        },
      },
    });

    return { outcome: "merged" as const, placeId, happeningId };
  });
}

export async function rejectIngestionTransaction(
  actor: Actor,
  ingestionId: string,
  reason: string,
) {
  const database = getDatabase();
  return database.$transaction(async (transaction) => {
    const rejected = await transaction.ingestionRecord.updateMany({
      where: { id: ingestionId, status: "NORMALIZED" },
      data: { status: "REJECTED", errorMessage: reason },
    });
    if (rejected.count !== 1) return false;
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        actorType: actor.type,
        action: "ingestion.rejected",
        targetType: "IngestionRecord",
        targetId: ingestionId,
        before: { status: "NORMALIZED" },
        after: { status: "REJECTED", reason },
      },
    });
    return true;
  });
}

export async function stageIngestionBatch(
  actor: Actor,
  batch: StageIngestionBatch,
  runId: string,
  fetchedAt: Date,
  finishedAt: Date,
) {
  return getDatabase().$transaction(async (transaction) => {
    const created = await transaction.ingestionRecord.createMany({
      data: batch.records.map((record) => ({
        ingestionRunId: runId,
        provider: batch.provider,
        externalId: record.externalId,
        checksum: record.checksum,
        status: "NORMALIZED",
        sourceUrl: record.sourceUrl,
        rawPayload: toJson(record.rawPayload),
        normalizedPayload: toJson(record.normalizedPayload),
        fetchedAt,
      })),
      skipDuplicates: true,
    });
    const selected = batch.records.length;
    const completed = await transaction.ingestionRun.updateMany({
      where: { id: runId, status: "RUNNING" },
      data: {
        status: "SUCCEEDED",
        totalAvailable: batch.totalAvailable,
        fetched: batch.fetched,
        selected,
        inserted: created.count,
        unchanged: selected - created.count,
        errorMessage: null,
        finishedAt,
      },
    });
    if (completed.count !== 1)
      throw new Error("Ingestion run was already finalized");
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        actorType: actor.type,
        action: "ingestion.run_succeeded",
        targetType: "IngestionRun",
        targetId: runId,
        after: {
          provider: batch.provider,
          status: "SUCCEEDED",
          fetched: batch.fetched,
          selected,
          inserted: created.count,
          unchanged: selected - created.count,
          totalAvailable: batch.totalAvailable,
          fetchedAt: fetchedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
        },
      },
    });
    return { inserted: created.count };
  });
}
