/* eslint-disable no-console */

import { config } from "dotenv";
import { getDatabase } from "../src/client";
import { searchKakaoPlaces, type KakaoPlaceDocument } from "../src/kakao-local";

config({ path: "../../apps/web/.env" });

const areas = [
  { slug: "seongsu", label: "성수", lat: 37.5446, lng: 127.0559 },
  { slug: "yeonnam", label: "연남", lat: 37.5627, lng: 126.9258 },
  { slug: "seochon", label: "서촌", lat: 37.579, lng: 126.9715 },
  { slug: "hannam", label: "한남", lat: 37.5346, lng: 127.0005 },
  { slug: "mangwon", label: "망원", lat: 37.5562, lng: 126.9016 },
] as const;

const categories = [
  { category: "EXHIBITION", keyword: "전시" },
  { category: "CAFE", keyword: "카페" },
  { category: "SHOP", keyword: "소품샵" },
  { category: "RESTAURANT", keyword: "데이트 맛집" },
  { category: "ACTIVITY", keyword: "산책 명소" },
  { category: "BAR", keyword: "LP바" },
] as const;

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
    const documents = await searchKakaoPlaces({
      restApiKey,
      query: `${area.label} ${category.keyword}`,
      center: { lat: area.lat, lng: area.lng },
      radiusMeters: 2_500,
      size: 3,
    });
    for (const document of documents) {
      await upsertPlace(area, category.category, document);
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
