import {
  ExploreScreen,
  placeListQuerySchema,
  searchPlaces,
} from "@/features/places";
import { isLocale } from "@/i18n/config";
import { webEnv } from "@/lib/env";
import { notFound } from "next/navigation";

interface ExplorePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ExplorePage({
  params,
  searchParams,
}: Readonly<ExplorePageProps>) {
  const [{ locale }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!isLocale(locale)) notFound();
  const parsed = placeListQuerySchema.safeParse({
    locale,
    area:
      typeof rawSearchParams.area === "string"
        ? rawSearchParams.area
        : undefined,
    query:
      typeof rawSearchParams.query === "string" && rawSearchParams.query.trim()
        ? rawSearchParams.query
        : undefined,
    category:
      typeof rawSearchParams.category === "string"
        ? rawSearchParams.category
        : undefined,
    take: 30,
  });
  const query = parsed.success
    ? parsed.data
    : placeListQuerySchema.parse({ locale, take: 30 });
  const result = await searchPlaces(query);
  const mapConfig =
    locale === "ko"
      ? {
          provider: "kakao" as const,
          apiKey: webEnv.NEXT_PUBLIC_KAKAO_MAP_APP_KEY,
        }
      : {
          provider: "google" as const,
          apiKey: webEnv.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        };
  return (
    <ExploreScreen
      locale={locale}
      places={result.data}
      filters={query}
      mapConfig={mapConfig}
    />
  );
}

export const dynamic = "force-dynamic";
