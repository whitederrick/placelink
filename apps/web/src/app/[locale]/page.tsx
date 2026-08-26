import {
  HomeScreen,
  homeFeedQuerySchema,
  loadHomeFeed,
} from "@/features/discovery";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

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
  const { data: feed, nextCursor } = await loadHomeFeed(locale, query);
  return (
    <HomeScreen
      feed={feed}
      nextCursor={nextCursor}
      pageSize={query.take}
      locale={locale}
      activeFilters={query}
    />
  );
}

export const dynamic = "force-dynamic";
