import { z } from "zod";

const webEnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_KAKAO_MAP_APP_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_KAKAO_ID: z.string().min(1).optional(),
  AUTH_KAKAO_SECRET: z.string().min(1).optional(),
  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export const webEnv = webEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  LOG_LEVEL: process.env.LOG_LEVEL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_KAKAO_MAP_APP_KEY:
    process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY || undefined,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined,
  AUTH_SECRET: process.env.AUTH_SECRET || undefined,
  AUTH_KAKAO_ID: process.env.AUTH_KAKAO_ID || undefined,
  AUTH_KAKAO_SECRET: process.env.AUTH_KAKAO_SECRET || undefined,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID || undefined,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET || undefined,
  NODE_ENV: process.env.NODE_ENV,
});
