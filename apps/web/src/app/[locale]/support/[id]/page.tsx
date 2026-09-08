import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { getCustomerSupportCase } from "@/features/support-cases";
import { isLocale } from "@/i18n/config";
import { webEnv } from "@/lib/env";

export default async function CustomerSupportDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  if (!webEnv.AUTH_LOGIN_ENABLED) redirect(`/${locale}/my`);
  const session = await auth();
  const actor = session?.user?.id ? await loadHumanActor(session.user.id) : null;
  if (!actor) redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/${locale}/support/${id}`)}`);
  let supportCase;
  try { supportCase = (await getCustomerSupportCase(actor, id)).data; } catch { notFound(); }
  return <div className="screen-page customer-support-detail-page"><Link href={`/${locale}/support`}>← 문의 목록</Link><header className="customer-support-heading"><span className="section-kicker">SUPPORT</span><h1>{supportCase.subject}</h1><p>{supportCase.type} · {supportCase.status}</p></header><section className="support-description"><p>{supportCase.description}</p></section><section className="support-timeline" aria-label="문의 대화"><h2>처리 내역</h2>{supportCase.entries.map((entry) => <article key={entry.id}><p>{entry.body}</p><small>{entry.kind} · {new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}</small></article>)}</section></div>;
}

export const dynamic = "force-dynamic";
