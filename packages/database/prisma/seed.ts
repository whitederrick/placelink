import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client/client";
import { readDatabaseEnv } from "../src/env";
import { createSeedPlaces } from "../src/seed-data";

const adapter = new PrismaPg({
  connectionString: readDatabaseEnv().DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const users = [
  { id: "seed-user-jihoon", email: "jihoon@example.test", nickname: "지훈" },
  { id: "seed-user-minji", email: "minji@example.test", nickname: "민지" },
] as const;

const tags = [
  {
    id: "seed-tag-rain",
    kind: "SITUATION" as const,
    slug: "rainy-day",
    labelKo: "비오는 날",
    labelEn: "Rainy day",
  },
  {
    id: "seed-tag-anniversary",
    kind: "SITUATION" as const,
    slug: "anniversary",
    labelKo: "기념일",
    labelEn: "Anniversary",
  },
  {
    id: "seed-tag-cozy",
    kind: "MOOD" as const,
    slug: "cozy",
    labelKo: "아늑한",
    labelEn: "Cozy",
  },
  {
    id: "seed-tag-trendy",
    kind: "MOOD" as const,
    slug: "trendy",
    labelKo: "트렌디",
    labelEn: "Trendy",
  },
  {
    id: "seed-tag-mid",
    kind: "BUDGET" as const,
    slug: "mid-budget",
    labelKo: "5~10만원",
    labelEn: "₩50K–100K",
  },
] as const;

async function resetDatabase() {
  await prisma.$transaction([
    prisma.analyticsEvent.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.scrap.deleteMany(),
    prisma.courseTag.deleteMany(),
    prisma.placeTag.deleteMany(),
    prisma.courseNode.deleteMany(),
    prisma.course.deleteMany(),
    prisma.happeningTranslation.deleteMany(),
    prisma.happening.deleteMany(),
    prisma.placeProviderRef.deleteMany(),
    prisma.placeTranslation.deleteMany(),
    prisma.place.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.coupleMember.deleteMany(),
    prisma.couple.deleteMany(),
    prisma.authIdentity.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function seed() {
  const places = createSeedPlaces();
  await resetDatabase();

  await prisma.user.createMany({ data: [...users] });
  await prisma.authIdentity.createMany({
    data: users.map((user, index) => ({
      id: `seed-auth-${index + 1}`,
      userId: user.id,
      provider: index === 0 ? "KAKAO" : "GOOGLE",
      externalId: `seed-external-${index + 1}`,
    })),
  });

  await prisma.couple.create({
    data: {
      id: "seed-couple-jihoon-minji",
      displayName: "지훈♥민지",
      startedAt: new Date("2025-03-23T00:00:00.000Z"),
      members: {
        create: users.map((user, index) => ({
          id: `seed-member-${index + 1}`,
          userId: user.id,
        })),
      },
    },
  });

  await prisma.tag.createMany({ data: [...tags] });
  await prisma.place.createMany({
    data: places.map((place, index) => ({
      id: place.id,
      sourceType: index < 24 ? "PUBLIC_API" : "EDITOR",
      category: place.category,
      areaSlug: place.areaSlug,
      lat: place.lat,
      lng: place.lng,
    })),
  });
  await prisma.placeTranslation.createMany({
    data: places.flatMap((place) => [
      {
        id: `${place.id}-ko`,
        placeId: place.id,
        locale: "ko",
        name: place.nameKo,
        address: place.addressKo,
        summary: place.summaryKo,
      },
      {
        id: `${place.id}-en`,
        placeId: place.id,
        locale: "en",
        name: place.nameEn,
        address: place.addressEn,
        summary: place.summaryEn,
      },
    ]),
  });
  await prisma.placeProviderRef.createMany({
    data: places.map((place, index) => ({
      id: `seed-provider-${index + 1}`,
      placeId: place.id,
      provider: "TOUR_API",
      externalId: `tour-${index + 1}`,
    })),
  });

  const activeHappeningEnd = new Date("2026-07-31T14:59:59.000Z");
  const anchorPlaceIndexes = [0, 18, 12] as const;
  for (let index = 0; index < anchorPlaceIndexes.length; index += 1) {
    const happeningId = `seed-happening-${index + 1}`;
    const anchorPlace = places[anchorPlaceIndexes[index]!]!;
    await prisma.happening.create({
      data: {
        id: happeningId,
        placeId: anchorPlace.id,
        sourceType: "EDITOR",
        status: "ACTIVE",
        startsAt: new Date("2026-07-18T00:00:00.000Z"),
        endsAt: activeHappeningEnd,
        isAnchor: true,
        translations: {
          create: [
            {
              id: `${happeningId}-ko`,
              locale: "ko",
              title: `${anchorPlace.neighborhood} 여름 팝업`,
            },
            {
              id: `${happeningId}-en`,
              locale: "en",
              title: `${anchorPlace.nameEn} Summer Pop-up`,
            },
          ],
        },
      },
    });
  }

  for (let courseIndex = 0; courseIndex < 5; courseIndex += 1) {
    const courseId = `seed-course-${courseIndex + 1}`;
    const firstPlace = places[courseIndex * 3]!;
    const nodePlaces = [
      firstPlace,
      places[courseIndex * 3 + 1]!,
      places[courseIndex * 3 + 2]!,
    ];
    await prisma.course.create({
      data: {
        id: courseId,
        slug: `seed-date-course-${courseIndex + 1}`,
        coupleId: "seed-couple-jihoon-minji",
        status: "PUBLISHED",
        title: `${firstPlace.neighborhood}에서 이어지는 하루`,
        durationMinutes: 180 + courseIndex * 20,
        publishedAt: new Date(Date.UTC(2026, 6, 18 + courseIndex)),
        nodes: {
          create: nodePlaces.map((place, nodeIndex) => ({
            id: `${courseId}-node-${nodeIndex + 1}`,
            placeId: place.id,
            orderIndex: nodeIndex,
            durationMinutes: 50,
            distanceMeters: nodeIndex === 0 ? null : 550 + nodeIndex * 120,
            tip:
              nodeIndex === 0
                ? "예약 시간보다 10분 일찍 도착해요"
                : "천천히 둘러보기 좋은 곳이에요",
          })),
        },
        tags: {
          create: [
            { tagId: tags[courseIndex % tags.length]!.id },
            { tagId: tags[(courseIndex + 2) % tags.length]!.id },
          ],
        },
      },
    });
  }

  await prisma.scrap.createMany({
    data: [
      { id: "seed-scrap-1", userId: users[0].id, courseId: "seed-course-2" },
      { id: "seed-scrap-2", userId: users[1].id, courseId: "seed-course-1" },
    ],
  });
  await prisma.auditLog.create({
    data: {
      id: "seed-audit-1",
      actorId: users[0].id,
      actorType: "HUMAN",
      action: "happening.anchor_assigned",
      targetType: "Happening",
      targetId: "seed-happening-1",
      after: { isAnchor: true },
    },
  });
}

seed()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    throw error;
  });
