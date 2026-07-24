import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  experimental: {
    externalTables: true,
  },
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    initShadowDb: "CREATE EXTENSION IF NOT EXISTS postgis;",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
