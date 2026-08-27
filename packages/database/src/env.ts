import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
});

const seoulOpenDataEnvSchema = z.object({
  SEOUL_OPEN_DATA_API_KEY: z.string().min(1),
});

export function readDatabaseEnv() {
  return databaseEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
  });
}

export function readSeoulOpenDataEnv() {
  return seoulOpenDataEnvSchema.parse({
    SEOUL_OPEN_DATA_API_KEY: process.env.SEOUL_OPEN_DATA_API_KEY,
  });
}
