import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { getStudioCourse } from "@/features/courses";
import { ContentModerationActions } from "@/features/content-moderation/components/ContentModerationActions";
import { isLocale } from "@/i18n/config";

export default async function StudioCourseDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const session = await auth();
  const actor = session?.user?.id ? await loadHumanActor(session.user.id) : null;
  if (!actor || actor.role !== "ADMIN") notFound();
  let course;
  try { course = await getStudioCourse(actor, slug); } catch { notFound(); }
  return <div className="screen-page"><Link href={`/${locale}/studio`}>← Studio</Link><header className="analytics-heading"><span className="section-kicker">COURSE</span><h1>{course.title}</h1><p>{course.status} · {course.creatorUser?.nickname ?? course.couple?.displayName ?? "익명"}</p></header><ContentModerationActions targetType="Course" targetId={course.id} /><section><h2>코스 정보</h2><p>{course.description ?? "설명 없음"}</p><p>소요 시간: {course.durationMinutes ?? "미정"}분 · {course.dayCount}일</p></section><section><h2>태그</h2><p>{course.tags.map(({ tag }) => locale === "ko" ? tag.labelKo : tag.labelEn).join(" · ") || "없음"}</p></section><section><h2>코스 노드</h2>{course.nodes.map((node) => <article key={node.id}><h3>{node.orderIndex + 1}. {node.place.translations.find((item) => item.locale === locale)?.name ?? node.place.id}</h3><p>{node.place.status} · {node.tip ?? "메모 없음"}</p></article>)}</section></div>;
}

export const dynamic = "force-dynamic";
