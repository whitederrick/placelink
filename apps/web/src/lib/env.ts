import { z } from "zod";

const webEnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_KAKAO_MAP_APP_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
  KMA_SERVICE_KEY: z.string().min(1).optional(),
  SEOUL_OPEN_DATA_API_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_KAKAO_ID: z.string().min(1).optional(),
  AUTH_KAKAO_SECRET: z.string().min(1).optional(),
  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
  AUTH_LOGIN_ENABLED: z
    .enum(["true", "false"])
    .transform((value) => value === "true"),
  ADMIN_USER_IDS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  STUDIO_OPERATOR_EMAILS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
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
  KMA_SERVICE_KEY: process.env.KMA_SERVICE_KEY || undefined,
  SEOUL_OPEN_DATA_API_KEY:
    process.env.SEOUL_OPEN_DATA_API_KEY || undefined,
  CRON_SECRET: process.env.CRON_SECRET || undefined,
  AUTH_SECRET: process.env.AUTH_SECRET || undefined,
  AUTH_KAKAO_ID: process.env.AUTH_KAKAO_ID || undefined,
  AUTH_KAKAO_SECRET: process.env.AUTH_KAKAO_SECRET || undefined,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID || undefined,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET || undefined,
  AUTH_LOGIN_ENABLED:
    process.env.AUTH_LOGIN_ENABLED ??
    (process.env.NODE_ENV === "production" ? "false" : "true"),
  ADMIN_USER_IDS: process.env.ADMIN_USER_IDS,
  STUDIO_OPERATOR_EMAILS: process.env.STUDIO_OPERATOR_EMAILS,
  NODE_ENV: process.env.NODE_ENV,
});
