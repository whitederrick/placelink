import { z } from "zod";

const kakaoPlaceDocumentSchema = z.object({
  id: z.string().min(1),
  place_name: z.string().min(1),
  category_name: z.string(),
  category_group_code: z.string(),
  category_group_name: z.string(),
  phone: z.string(),
  address_name: z.string(),
  road_address_name: z.string(),
  x: z.string(),
  y: z.string(),
  place_url: z.string().url(),
  distance: z.string(),
});

const kakaoPlaceSearchResponseSchema = z.object({
  meta: z.object({
    total_count: z.number().int().nonnegative(),
    pageable_count: z.number().int().nonnegative(),
    is_end: z.boolean(),
  }),
  documents: z.array(kakaoPlaceDocumentSchema),
});

export type KakaoPlaceDocument = z.infer<typeof kakaoPlaceDocumentSchema>;

export interface KakaoPlaceSelectionPolicy {
  allowedGroupCodes?: string[];
  categoryIncludesAny?: string[];
  categoryExcludesAny?: string[];
  nameOrCategoryExcludesAny?: string[];
}

export function selectKakaoPlaces(
  documents: KakaoPlaceDocument[],
  policy: KakaoPlaceSelectionPolicy,
  limit: number,
): KakaoPlaceDocument[] {
  return documents
    .filter((document) => {
      if (
        policy.allowedGroupCodes &&
        !policy.allowedGroupCodes.includes(document.category_group_code)
      ) {
        return false;
      }
      if (
        policy.categoryIncludesAny &&
        !policy.categoryIncludesAny.some((value) =>
          document.category_name.includes(value),
        )
      ) {
        return false;
      }
      if (
        policy.categoryExcludesAny?.some((value) =>
          document.category_name.includes(value),
        )
      ) {
        return false;
      }
      if (
        policy.nameOrCategoryExcludesAny?.some(
          (value) =>
            document.place_name.includes(value) ||
            document.category_name.includes(value),
        )
      ) {
        return false;
      }
      return true;
    })
    .slice(0, Math.max(0, limit));
}

export interface KakaoPlaceSearchInput {
  restApiKey: string;
  query: string;
  center: { lat: number; lng: number };
  radiusMeters?: number;
  size?: number;
  fetcher?: typeof fetch;
}

export async function searchKakaoPlaces({
  restApiKey,
  query,
  center,
  radiusMeters = 2_500,
  size = 5,
  fetcher = fetch,
}: KakaoPlaceSearchInput): Promise<KakaoPlaceDocument[]> {
  const parameters = new URLSearchParams({
    query,
    x: String(center.lng),
    y: String(center.lat),
    radius: String(radiusMeters),
    size: String(Math.min(15, Math.max(1, size))),
    sort: "distance",
  });
  const response = await fetcher(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${parameters}`,
    {
      headers: { Authorization: `KakaoAK ${restApiKey}` },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Kakao Local API request failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  return kakaoPlaceSearchResponseSchema.parse(await response.json()).documents;
}
