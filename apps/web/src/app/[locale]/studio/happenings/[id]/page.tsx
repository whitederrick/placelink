import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getHappeningForCuration } from "@/features/admin-curation";
import { loadHumanActor } from "@/features/auth";
import { isLocale } from "@/i18n/config";
import { HappeningDetailActions } from "@/features/admin-curation/components/HappeningDetailActions";

export default async function StudioHappeningDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const session = await auth();
  const actor = session?.user?.id ? await loadHumanActor(session.user.id) : null;
  if (!actor || actor.role !== "ADMIN") notFound();
  let happening;
  try { happening = await getHappeningForCuration(actor, id); } catch { notFound(); }
  return <div className="screen-page"><Link href={`/${locale}/studio/happenings`}>← 행사 목록</Link><header className="analytics-heading"><span className="section-kicker">HAPPENING</span><h1>{happening.translations.find((item) => item.locale === locale)?.title ?? happening.translations[0]?.title ?? happening.id}</h1><p>{happening.kind ?? "OTHER"} · {happening.status} · {happening.isAnchor ? "앵커" : "일반"}</p></header><HappeningDetailActions id={happening.id} isAnchor={happening.isAnchor} status={happening.status} /><section><h2>행사 일정</h2><p>{happening.startsAt.toISOString()} – {happening.endsAt.toISOString()}</p></section><section><h2>장소</h2><p>{happening.place.translations.find((item) => item.locale === locale)?.name ?? happening.place.id}</p>{happening.place.translations.map((item) => <p key={item.locale}>{item.locale}: {item.name} · {item.address}</p>)}</section><section><h2>번역·원문</h2>{happening.translations.map((item) => <article key={item.locale}><h3>{item.locale}: {item.title}</h3><p>{item.description ?? "설명 없음"}</p><small>{item.scheduleText ?? "일정 문구 없음"}</small></article>)}</section><section><h2>공급자 참조</h2>{happening.providerRefs.length ? happening.providerRefs.map((ref) => <p key={`${ref.provider}:${ref.externalId}`}>{ref.provider} · {ref.externalId}{ref.sourceUrl ? <> · <a href={ref.sourceUrl}>원문</a></> : null}{ref.bookingUrl ? <> · <a href={ref.bookingUrl}>예약</a></> : null}</p>) : <p>공급자 참조 없음</p>}</section></div>;
}

export const dynamic = "force-dynamic";
