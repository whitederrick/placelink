import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { getStudioPlace } from "@/features/places";
import { ContentModerationActions } from "@/features/content-moderation/components/ContentModerationActions";
import { isLocale } from "@/i18n/config";

export default async function StudioPlaceDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const session = await auth();
  const actor = session?.user?.id ? await loadHumanActor(session.user.id) : null;
  if (!actor || actor.role !== "ADMIN") notFound();
  let place;
  try { place = await getStudioPlace(actor, id); } catch { notFound(); }
  const name = place.translations.find((item) => item.locale === locale)?.name ?? place.translations[0]?.name ?? place.id;
  return <div className="screen-page"><Link href={`/${locale}/studio/happenings`}>← 운영 목록</Link><header className="analytics-heading"><span className="section-kicker">PLACE</span><h1>{name}</h1><p>{place.category} · {place.kind ?? "OTHER"} · {place.status}</p></header><ContentModerationActions targetType="Place" targetId={place.id} /><section><h2>장소 정보</h2>{place.translations.map((item) => <p key={item.locale}>{item.locale}: {item.name} · {item.address}{item.summary ? ` · ${item.summary}` : ""}</p>)}<p>좌표: {place.lat.toString()}, {place.lng.toString()}</p></section><section><h2>공급자 참조</h2>{place.providerRefs.length ? place.providerRefs.map((ref) => <p key={`${ref.provider}:${ref.externalId}`}>{ref.provider} · {ref.externalId}{ref.sourceUrl ? <> · <a href={ref.sourceUrl}>원문</a></> : null}</p>) : <p>없음</p>}</section><section><h2>연결 행사</h2>{place.happenings.map((item) => <p key={item.id}><Link href={`/${locale}/studio/happenings/${item.id}`}>{item.translations[0]?.title ?? item.id}</Link> · {item.status}</p>)}</section><section><h2>연결 코스</h2>{place.courseNodes.map(({ course }) => <p key={course.id}>{course.title} · {course.status}</p>)}</section></div>;
}

export const dynamic = "force-dynamic";
