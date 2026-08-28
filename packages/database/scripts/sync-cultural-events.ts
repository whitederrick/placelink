/* eslint-disable no-console */

import { config } from "dotenv";
import type { Prisma } from "../generated/client/client";
import { getDatabase } from "../src/client";
import {
  checksumPayload,
  fetchSeoulCulturalEvents,
  normalizeSeoulCulturalEvent,
} from "../src/cultural-events";
import { readSeoulOpenDataEnv } from "../src/env";

config({ path: "../../apps/web/.env.local" });
config({ path: "../../apps/web/.env" });
config({ path: ".env" });

const argumentsSet = new Set(process.argv.slice(2));
const stage = argumentsSet.has("--stage");

function integerArgument(name: string, fallback: number) {
  const value = process.argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.split("=")[1];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer`);
  return parsed;
}

function dateArgument(name: string) {
  const value = process.argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.split("=")[1];
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error(`${name} must use YYYY-MM-DD`);
  return value;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const start = integerArgument("start", 1);
const end = integerArgument("end", 100);
const from = dateArgument("from");
const to = dateArgument("to");
const { SEOUL_OPEN_DATA_API_KEY: apiKey } = readSeoulOpenDataEnv();
const fetchedAt = new Date();

const response = await fetchSeoulCulturalEvents({ apiKey, start, end });
const records = response.events
  .map((rawPayload) => ({
    rawPayload,
    normalizedPayload: normalizeSeoulCulturalEvent(rawPayload),
  }))
  .filter(({ normalizedPayload }) => {
    const startsOn = normalizedPayload.startsAt.slice(0, 10);
    const endsOn = normalizedPayload.endsAt.slice(0, 10);
    return (!from || endsOn >= from) && (!to || startsOn <= to);
  });

if (!stage) {
  for (const record of records)
    console.log(
      JSON.stringify({ action: "review", ...record.normalizedPayload }),
    );
  console.log(
    JSON.stringify({
      provider: "SEOUL_OPEN_DATA",
      staged: false,
      fetched: response.events.length,
      selected: records.length,
      totalAvailable: response.totalCount,
    }),
  );
  process.exit(0);
}

const database = getDatabase();
const result = await database.ingestionRecord.createMany({
  data: records.map(({ rawPayload, normalizedPayload }) => ({
    provider: "SEOUL_OPEN_DATA",
    externalId: normalizedPayload.externalId,
    checksum: checksumPayload(rawPayload),
    status: "NORMALIZED",
    sourceUrl: normalizedPayload.officialUrl,
    rawPayload: toJson(rawPayload),
    normalizedPayload: toJson(normalizedPayload),
    fetchedAt,
  })),
  skipDuplicates: true,
});

console.log(
  JSON.stringify({
    provider: "SEOUL_OPEN_DATA",
    staged: true,
    fetched: response.events.length,
    selected: records.length,
    inserted: result.count,
    unchanged: records.length - result.count,
    totalAvailable: response.totalCount,
  }),
);

await database.$disconnect();
