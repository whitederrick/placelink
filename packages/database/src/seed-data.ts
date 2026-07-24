export interface SeedPlace {
  id: string;
  category: string;
  areaSlug: string;
  neighborhood: string;
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
}

const neighborhoods = [
  { slug: "seongsu", ko: "성수", en: "Seongsu", lat: 37.5446, lng: 127.0559 },
  { slug: "yeonnam", ko: "연남", en: "Yeonnam", lat: 37.5627, lng: 126.9258 },
  { slug: "seochon", ko: "서촌", en: "Seochon", lat: 37.579, lng: 126.9715 },
  { slug: "hannam", ko: "한남", en: "Hannam", lat: 37.5346, lng: 127.0005 },
  { slug: "mangwon", ko: "망원", en: "Mangwon", lat: 37.5562, lng: 126.9016 }
] as const;

const placeConcepts = [
  { ko: "아카이브 전시", en: "Archive Gallery", category: "EXHIBITION" },
  { ko: "로우키 커피", en: "Lowkey Coffee", category: "CAFE" },
  { ko: "오브젝트 룸", en: "Object Room", category: "SHOP" },
  { ko: "소일 다이닝", en: "Soil Dining", category: "RESTAURANT" },
  { ko: "선셋 산책로", en: "Sunset Walk", category: "ACTIVITY" },
  { ko: "사운드 바", en: "Sound Bar", category: "BAR" }
] as const;

export function createSeedPlaces(): SeedPlace[] {
  return neighborhoods.flatMap((neighborhood, neighborhoodIndex) =>
    placeConcepts.map((concept, conceptIndex) => {
      const placeNumber = neighborhoodIndex * placeConcepts.length + conceptIndex + 1;
      return {
        id: `seed-place-${String(placeNumber).padStart(2, "0")}`,
        category: concept.category,
        areaSlug: neighborhood.slug,
        neighborhood: neighborhood.ko,
        nameKo: `${neighborhood.ko} ${concept.ko}`,
        nameEn: `${neighborhood.en} ${concept.en}`,
        lat: neighborhood.lat + conceptIndex * 0.0012,
        lng: neighborhood.lng + conceptIndex * 0.0011
      };
    })
  );
}
