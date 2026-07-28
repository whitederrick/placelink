/* eslint-disable no-console */

import { config } from "dotenv";
import { getDatabase } from "../src/client";
import {
  searchKakaoPlaces,
  selectKakaoPlaces,
  type KakaoPlaceDocument,
  type KakaoPlaceSelectionPolicy,
} from "../src/kakao-local";

config({ path: "../../apps/web/.env" });

const areas = [
  { slug: "seongsu", label: "성수", lat: 37.5446, lng: 127.0559 },
  { slug: "yeonnam", label: "연남", lat: 37.5627, lng: 126.9258 },
  { slug: "seochon", label: "서촌", lat: 37.579, lng: 126.9715 },
  { slug: "hannam", label: "한남", lat: 37.5346, lng: 127.0005 },
  { slug: "mangwon", label: "망원", lat: 37.5562, lng: 126.9016 },
] as const;

const categories = [
  {
    category: "EXHIBITION",
    keyword: "전시",
    policy: { categoryIncludesAny: ["문화,예술"] },
  },
  {
    category: "CAFE",
    keyword: "카페",
    policy: {
      allowedGroupCodes: ["CE7"],
      nameOrCategoryExcludesAny: [
        "스타벅스",
        "컴포즈커피",
        "메가MGC커피",
        "빽다방",
        "투썸플레이스",
        "이디야커피",
        "커피빈",
        "할리스",
        "폴바셋",
      ],
    },
  },
  { category: "SHOP", keyword: "소품샵", policy: {} },
  {
    category: "RESTAURANT",
    keyword: "데이트 맛집",
    policy: {
      allowedGroupCodes: ["FD6"],
      categoryExcludesAny: ["술집"],
    },
  },
  {
    category: "ACTIVITY",
    keyword: "산책 명소",
    policy: { categoryIncludesAny: ["여행 > 관광,명소"] },
  },
  {
    category: "BAR",
    keyword: "LP바",
    policy: {
      allowedGroupCodes: ["FD6"],
      categoryIncludesAny: ["술집"],
    },
  },
] satisfies ReadonlyArray<{
  category: string;
  keyword: string;
  policy: KakaoPlaceSelectionPolicy;
}>;

const argumentsSet = new Set(process.argv.slice(2));
const dryRun = argumentsSet.has("--dry-run");
const selectedArea = process.argv
  .find((argument) => argument.startsWith("--area="))
  ?.split("=")[1];
const restApiKey = process.env.KAKAO_LOCAL_REST_API_KEY;

if (!restApiKey) {
  throw new Error(
    "KAKAO_LOCAL_REST_API_KEY is required. Add it to apps/web/.env or the shell environment.",
  );
}

const targetAreas = selectedArea
  ? areas.filter((area) => area.slug === selectedArea)
  : areas;

if (targetAreas.length === 0) {
  throw new Error(`Unknown area: ${selectedArea}`);
}

const database = getDatabase();
let created = 0;
let updated = 0;

async function upsertPlace(
  area: (typeof areas)[number],
  category: (typeof categories)[number]["category"],
  document: KakaoPlaceDocument,
) {
  const existingReference = await database.placeProviderRef.findUnique({
    where: {
      provider_externalId: { provider: "KAKAO", externalId: document.id },
    },
    select: { placeId: true },
  });
  const address = document.road_address_name || document.address_name;
  const placeId = existingReference?.placeId ?? `kakao-place-${document.id}`;

  if (dryRun) {
    console.log(
      JSON.stringify({
        action: existingReference ? "update" : "create",
        area: area.slug,
        category,
        name: document.place_name,
        address,
        providerCategory: document.category_name,
        distanceMeters: Number(document.distance),
      }),
    );
    return;
  }

  await database.$transaction(async (transaction) => {
    if (existingReference) {
      await transaction.place.update({
        where: { id: placeId },
        data: {
          status: "ACTIVE",
          category,
          areaSlug: area.slug,
          lat: Number(document.y),
          lng: Number(document.x),
          phone: document.phone || null,
          websiteUrl: document.place_url,
        },
      });
      updated += 1;
    } else {
      await transaction.place.create({
        data: {
          id: placeId,
          sourceType: "PUBLIC_API",
          status: "ACTIVE",
          category,
          areaSlug: area.slug,
          lat: Number(document.y),
          lng: Number(document.x),
          phone: document.phone || null,
          websiteUrl: document.place_url,
          providerRefs: {
            create: {
              id: `kakao-ref-${document.id}`,
              provider: "KAKAO",
              externalId: document.id,
              sourceUrl: document.place_url,
            },
          },
        },
      });
      created += 1;
    }

    for (const locale of ["ko", "en"] as const) {
      await transaction.placeTranslation.upsert({
        where: { placeId_locale: { placeId, locale } },
        create: {
          id: `${placeId}-${locale}`,
          placeId,
          locale,
          name: document.place_name,
          address,
          summary: document.category_name || null,
        },
        update: {
          name: document.place_name,
          address,
          summary: document.category_name || null,
        },
      });
    }
  });
}

for (const area of targetAreas) {
  for (const category of categories) {
    const candidates = await searchKakaoPlaces({
      restApiKey,
      query: `${area.label} ${category.keyword}`,
      center: { lat: area.lat, lng: area.lng },
      radiusMeters: 2_500,
      size: 10,
    });
    const documents = selectKakaoPlaces(candidates, category.policy, 3);
    for (const document of documents) {
      await upsertPlace(
        area,
        category.category as (typeof categories)[number]["category"],
        document,
      );
    }
  }
}

console.log(
  JSON.stringify({
    provider: "KAKAO",
    dryRun,
    areas: targetAreas.map((area) => area.slug),
    created,
    updated,
  }),
);

await database.$disconnect();
