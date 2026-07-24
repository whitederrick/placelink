import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client/client";
import { readDatabaseEnv } from "./env";

let databaseClient: PrismaClient | undefined;

export function getDatabase(): PrismaClient {
  if (databaseClient) return databaseClient;
  const databaseEnv = readDatabaseEnv();
  const adapter = new PrismaPg({ connectionString: databaseEnv.DATABASE_URL });
  databaseClient = new PrismaClient({ adapter });
  return databaseClient;
}
