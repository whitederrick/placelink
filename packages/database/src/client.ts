import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client/client";
import { readDatabaseEnv } from "./env";

const globalForDatabase = globalThis as typeof globalThis & {
  placeLinkDatabaseClient?: PrismaClient;
};

export function getDatabase(): PrismaClient {
  if (globalForDatabase.placeLinkDatabaseClient) {
    return globalForDatabase.placeLinkDatabaseClient;
  }

  const databaseEnv = readDatabaseEnv();
  const adapter = new PrismaPg({
    connectionString: databaseEnv.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    max: 1,
  });
  const databaseClient = new PrismaClient({ adapter });
  globalForDatabase.placeLinkDatabaseClient = databaseClient;
  return databaseClient;
}
