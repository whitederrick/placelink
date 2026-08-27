import {
  normalizedCulturalEventSchema,
  type ExternalProvider,
} from "@placelink/database";
import type { Actor } from "@/lib/auth/actor";
import { AppError, ErrorCode } from "@/lib/errors";
import {
  ingestionRunDetailResponseSchema,
  ingestionRunListQuerySchema,
  ingestionRunListResponseSchema,
  studioDashboardResponseSchema,
} from "./schema";
import {
  selectIngestionRun,
  selectIngestionRuns,
  selectStudioDashboard,
} from "./queries";

function assertAdmin(actor: Actor) {
  if (actor.role !== "ADMIN")
    throw new AppError(ErrorCode.FORBIDDEN, "Admin permission required", 403);
}

function runSummary(run: {
  id: string;
  provider: ExternalProvider;
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
  trigger: "MANUAL" | "SCHEDULED";
  fetched: number;
  selected: number;
  inserted: number;
  unchanged: number;
  totalAvailable: number | null;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}) {
  return {
    ...run,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    durationMs: run.finishedAt
      ? Math.max(0, run.finishedAt.getTime() - run.startedAt.getTime())
      : null,
  };
}

export async function loadStudioDashboard(actor: Actor, now = new Date()) {
  assertAdmin(actor);
  const data = await selectStudioDashboard(now);
  return studioDashboardResponseSchema.parse({
    data: {
      metrics: data.metrics,
      providers: data.providerRuns.map(({ provider, run }) => ({
        provider,
        status: run?.status ?? null,
        inserted: run?.inserted ?? 0,
        errorMessage: run?.errorMessage ?? null,
        startedAt: run?.startedAt.toISOString() ?? null,
        finishedAt: run?.finishedAt?.toISOString() ?? null,
      })),
      recentRuns: data.recentRuns.map(runSummary),
    },
  });
}

export async function listIngestionRuns(
  actor: Actor,
  rawQuery: unknown = {},
) {
  assertAdmin(actor);
  const query = ingestionRunListQuerySchema.parse(rawQuery);
  const result = await selectIngestionRuns(query);
  return ingestionRunListResponseSchema.parse({
    data: result.records.map(runSummary),
    meta: { nextCursor: result.nextCursor },
  });
}

export async function getIngestionRun(actor: Actor, id: string) {
  assertAdmin(actor);
  const run = await selectIngestionRun(id);
  if (!run)
    throw new AppError(
      ErrorCode.INGESTION_NOT_FOUND,
      "Ingestion run not found",
      404,
    );
  return ingestionRunDetailResponseSchema.parse({
    data: {
      ...runSummary(run),
      actorId: run.actorId,
      actorType: run.actorType,
      requestPayload: run.requestPayload,
      records: run.records.map((record) => {
        const event = normalizedCulturalEventSchema.safeParse(
          record.normalizedPayload,
        );
        return {
          id: record.id,
          externalId: record.externalId,
          status: record.status,
          title: event.success ? event.data.title : null,
          fetchedAt: record.fetchedAt.toISOString(),
        };
      }),
    },
  });
}
