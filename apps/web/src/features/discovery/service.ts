import {
  homeFeedSchema,
  type HomeFeed,
  type HomeFeedLocale,
  type HomeFeedQuery,
} from "./schema";
import { selectHomeFeedRecords, type HomeFeedRecords } from "./queries";

const MILLISECONDS_PER_DAY = 86_400_000;
const DEFAULT_HOME_FEED_LIMIT = 20;
const HAPPENING_TONES = ["lime", "pink", "blue"] as const;
const COURSE_TONES = ["sunset", "mono", "violet"] as const;
const AREA_LABELS = {
  seongsu: { ko: "성수", en: "Seongsu" },
  yeonnam: { ko: "연남", en: "Yeonnam" },
  seochon: { ko: "서촌", en: "Seochon" },
  hannam: { ko: "한남", en: "Hannam" },
  mangwon: { ko: "망원", en: "Mangwon" },
} as const;

function formatDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}.${day}`;
}

function formatDuration(durationMinutes: number | null): string {
  const minutes = durationMinutes ?? 0;
  const hours = Math.floor(minutes / 60);
  return `${hours}H ${String(minutes % 60).padStart(2, "0")}M`;
}

function formatHappeningBadge(
  status: "UPCOMING" | "ACTIVE" | "ENDED",
  startsAt: Date,
  endsAt: Date,
  now: Date,
): string {
  if (status === "UPCOMING") return `${formatDate(startsAt)} OPEN`;
  if (status === "ENDED") return "ENDED";
  const daysRemaining = Math.max(
    0,
    Math.ceil((endsAt.getTime() - now.getTime()) / MILLISECONDS_PER_DAY),
  );
  return daysRemaining <= 7 ? `D-${daysRemaining}` : `~${formatDate(endsAt)}`;
}

function selectNeighborhood(
  areaSlug: string | null,
  name: string | undefined,
  locale: HomeFeedLocale,
): string {
  if (areaSlug && areaSlug in AREA_LABELS) {
    return AREA_LABELS[areaSlug as keyof typeof AREA_LABELS][locale];
  }
  return name?.split(" ")[0] ?? "SEOUL";
}

function mapCourse(
  course: HomeFeedRecords["courses"][number],
  index: number,
  locale: HomeFeedLocale,
) {
  return {
    slug: course.slug,
    coupleName:
      course.couple?.status === "ACTIVE"
        ? course.couple.displayName
        : course.couple
          ? locale === "ko"
            ? "익명 커플"
            : "Anonymous couple"
          : (course.creatorUser?.nickname ??
            (locale === "ko" ? "익명" : "Anonymous")),
    neighborhood: selectNeighborhood(
      course.nodes[0]?.place.areaSlug ?? null,
      course.nodes[0]?.place.translations[0]?.name,
      locale,
    ),
    duration: formatDuration(course.durationMinutes),
    stops: course._count.nodes,
    scraps: course.scrapCount,
    views: course.viewCount,
    tags: course.tags.map(({ tag }) =>
      locale === "ko" ? tag.labelKo : tag.labelEn,
    ),
    tone: COURSE_TONES[index % COURSE_TONES.length],
  };
}

export function buildHomeFeed(
  records: HomeFeedRecords,
  locale: HomeFeedLocale,
  now: Date,
): HomeFeed {
  const option = (tag: HomeFeedRecords["filterTags"][number]) => ({
    slug: tag.slug,
    label: locale === "ko" ? tag.labelKo : tag.labelEn,
  });

  return homeFeedSchema.parse({
    happenings: records.happenings.map((happening, index) => ({
      id: happening.id,
      neighborhood: selectNeighborhood(
        happening.place.areaSlug,
        happening.place.translations[0]?.name,
        locale,
      ),
      title: happening.translations[0]?.title ?? happening.id,
      period: `${formatDate(happening.startsAt)} → ${formatDate(happening.endsAt)}`,
      dDay: formatHappeningBadge(
        happening.status,
        happening.startsAt,
        happening.endsAt,
        now,
      ),
      tone: HAPPENING_TONES[index % HAPPENING_TONES.length],
    })),
    courses: records.courses
      .filter((course) => course._count.nodes > 0)
      .map((course, index) => mapCourse(course, index, locale)),
    hallOfFame: records.hallCandidates
      .filter((course) => course._count.nodes > 0)
      .map((course, index) => ({
        ...mapCourse(course, index, locale),
        rank: index + 1,
        weeklyScraps: course.weeklyScraps,
        score: course.weeklyScraps * 5,
      }))
      .slice(0, 3),
    filters: {
      situations: records.filterTags
        .filter((tag) => tag.kind === "SITUATION")
        .map(option),
      budgets: records.filterTags
        .filter((tag) => tag.kind === "BUDGET")
        .map(option),
      moods: records.filterTags
        .filter((tag) => tag.kind === "MOOD")
        .map(option),
    },
  });
}

interface HomeFeedPage {
  data: HomeFeed;
  nextCursor?: string;
}

export async function loadHomeFeed(
  locale: HomeFeedLocale,
  rawQuery: Partial<HomeFeedQuery> = {},
  now = new Date(),
): Promise<HomeFeedPage> {
  const query: HomeFeedQuery = {
    locale,
    take: DEFAULT_HOME_FEED_LIMIT,
    sort: "latest",
    ...rawQuery,
  };
  const records = await selectHomeFeedRecords(locale, query, now);
  const hasNextPage = records.courses.length > query.take;
  const visibleCourses = records.courses.slice(0, query.take);
  return {
    data: buildHomeFeed({ ...records, courses: visibleCourses }, locale, now),
    nextCursor: hasNextPage ? visibleCourses.at(-1)?.slug : undefined,
  };
}
