import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://")
});

export function readDatabaseEnv() {
  return databaseEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL
  });
}
