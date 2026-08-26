import {
  HomeScreen,
  homeFeedQuerySchema,
  loadHomeFeed,
  loadHomeHero,
} from "@/features/discovery";
import { isLocale } from "@/i18n/config";
import { createKmaWeatherProvider } from "@/lib/adapters/weather";
import { webEnv } from "@/lib/env";
import { notFound } from "next/navigation";

const weatherProvider = webEnv.KMA_SERVICE_KEY
  ? createKmaWeatherProvider(webEnv.KMA_SERVICE_KEY)
  : undefined;

export default async function HomePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [{ locale }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!isLocale(locale)) notFound();
  const query = homeFeedQuerySchema.parse({
    locale,
    take:
      typeof rawSearchParams.take === "string"
        ? rawSearchParams.take
        : undefined,
    sort:
      typeof rawSearchParams.sort === "string"
        ? rawSearchParams.sort
        : undefined,
    area:
      typeof rawSearchParams.area === "string"
        ? rawSearchParams.area
        : undefined,
    situation:
      typeof rawSearchParams.situation === "string"
        ? rawSearchParams.situation
        : undefined,
    budget:
      typeof rawSearchParams.budget === "string"
        ? rawSearchParams.budget
        : undefined,
    mood:
      typeof rawSearchParams.mood === "string"
        ? rawSearchParams.mood
        : undefined,
  });
  const now = new Date();
  const [{ data: feed, nextCursor }, hero] = await Promise.all([
    loadHomeFeed(locale, query, now),
    loadHomeHero(now, weatherProvider),
  ]);
  return (
    <HomeScreen
      feed={feed}
      nextCursor={nextCursor}
      pageSize={query.take}
      locale={locale}
      activeFilters={query}
      dayPeriod={hero.dayPeriod}
      weather={hero.weather}
    />
  );
}

export const dynamic = "force-dynamic";
