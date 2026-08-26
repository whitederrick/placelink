export interface SeedPlace {
  id: string;
  category: string;
  areaSlug: string;
  neighborhood: string;
  nameKo: string;
  nameEn: string;
  addressKo: string;
  addressEn: string;
  summaryKo: string;
  summaryEn: string;
  lat: number;
  lng: number;
}

const MILLISECONDS_PER_DAY = 86_400_000;

export function createSeedHappeningWindow(now: Date) {
  return {
    startsAt: new Date(now.getTime() - 7 * MILLISECONDS_PER_DAY),
    endsAt: new Date(now.getTime() + 90 * MILLISECONDS_PER_DAY),
  };
}

const neighborhoods = [
  { slug: "seongsu", ko: "성수", en: "Seongsu", lat: 37.5446, lng: 127.0559 },
  { slug: "yeonnam", ko: "연남", en: "Yeonnam", lat: 37.5627, lng: 126.9258 },
  { slug: "seochon", ko: "서촌", en: "Seochon", lat: 37.579, lng: 126.9715 },
  { slug: "hannam", ko: "한남", en: "Hannam", lat: 37.5346, lng: 127.0005 },
  { slug: "mangwon", ko: "망원", en: "Mangwon", lat: 37.5562, lng: 126.9016 },
] as const;

const placeConcepts = [
  {
    category: "EXHIBITION",
    summaryKo: "천천히 작품을 둘러보며 대화를 시작하기 좋은 작은 전시 공간",
    summaryEn: "A small gallery for slow looking and easy conversation",
  },
  {
    category: "CAFE",
    summaryKo: "창가에 나란히 앉아 다음 장소를 고르기 좋은 조용한 커피 바",
    summaryEn: "A quiet coffee bar for choosing the next stop together",
  },
  {
    category: "SHOP",
    summaryKo: "서로의 취향을 발견할 수 있는 생활 소품과 독립 브랜드 편집숍",
    summaryEn: "A curated shop of objects and independent labels",
  },
  {
    category: "RESTAURANT",
    summaryKo: "긴 대화를 나누기 좋은 편안한 조명과 제철 메뉴의 작은 식당",
    summaryEn: "Seasonal plates and soft lighting for an unhurried dinner",
  },
  {
    category: "ACTIVITY",
    summaryKo: "걷는 속도를 맞추며 쉬어갈 수 있는 동네의 산책 구간",
    summaryEn: "A relaxed neighborhood walk with room to pause",
  },
  {
    category: "BAR",
    summaryKo: "낮은 조명과 좋은 음악으로 하루를 차분히 마무리하는 공간",
    summaryEn: "Warm lights and good music for a calm end to the day",
  },
] as const;

const placeNamesKo = [
  "레이어 아카이브",
  "모로우 커피",
  "포름 오브젝트",
  "테이블 소일",
  "서울숲 슬로우 워크",
  "니들 사운드바",
  "윈도우 갤러리",
  "브루 레코드",
  "데일리 셸프",
  "저녁의 식탁",
  "경의선 정원 산책",
  "오후의 바이닐",
  "누하 아카이브",
  "고요 커피",
  "서가의 물건",
  "작은 계절",
  "수성동 계곡길",
  "밤의 서재",
  "콘크리트룸",
  "테라스 커피",
  "에디트 숍",
  "한강 다이닝",
  "독서당 산책길",
  "레코드 캐비닛",
  "망원 작은 전시",
  "오후 커피",
  "동네 수집점",
  "시장 옆 식탁",
  "한강 피크닉 길",
  "로우 볼륨 바",
] as const;

const placeNamesEn = [
  "Layer Archive",
  "Morrow Coffee",
  "Forme Object",
  "Table Soil",
  "Seoul Forest Slow Walk",
  "Needle Sound Bar",
  "Window Gallery",
  "Brew Record",
  "Daily Shelf",
  "Evening Table",
  "Gyeongui Garden Walk",
  "Afternoon Vinyl",
  "Nuha Archive",
  "Goyo Coffee",
  "Objects on the Shelf",
  "Small Season",
  "Suseong Valley Walk",
  "Night Library",
  "Concrete Room",
  "Terrace Coffee",
  "Edit Shop",
  "Han River Dining",
  "Dokseodang Walk",
  "Record Cabinet",
  "Small Mangwon Gallery",
  "Afternoon Coffee",
  "Neighborhood Collection",
  "Market-side Table",
  "Han River Picnic Walk",
  "Low Volume Bar",
] as const;

export function createSeedPlaces(): SeedPlace[] {
  return neighborhoods.flatMap((neighborhood, neighborhoodIndex) =>
    placeConcepts.map((concept, conceptIndex) => {
      const placeNumber =
        neighborhoodIndex * placeConcepts.length + conceptIndex + 1;
      return {
        id: `seed-place-${String(placeNumber).padStart(2, "0")}`,
        category: concept.category,
        areaSlug: neighborhood.slug,
        neighborhood: neighborhood.ko,
        nameKo: placeNamesKo[placeNumber - 1]!,
        nameEn: placeNamesEn[placeNumber - 1]!,
        addressKo: `서울 ${neighborhood.ko} 일대`,
        addressEn: `${neighborhood.en}, Seoul`,
        summaryKo: concept.summaryKo,
        summaryEn: concept.summaryEn,
        lat: neighborhood.lat + conceptIndex * 0.0012,
        lng: neighborhood.lng + conceptIndex * 0.0011,
      };
    }),
  );
}
