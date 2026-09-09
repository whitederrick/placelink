import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { CustomerSupportForm } from "@/features/support-cases/components/CustomerSupportForm";
import { listCustomerSupportCases } from "@/features/support-cases";
import { isLocale } from "@/i18n/config";
import { webEnv } from "@/lib/env";

const supportTypes = ["INQUIRY", "COMPLAINT", "REPORT", "PRIVACY"] as const;
const targetTypes = ["Course", "Place", "Happening"] as const;

export default async function CustomerSupportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!webEnv.AUTH_LOGIN_ENABLED) redirect(`/${locale}/my`);
  const session = await auth();
  const actor = session?.user?.id
    ? await loadHumanActor(session.user.id)
    : null;
  if (!actor) {
    redirect(
      `/api/auth/signin?callbackUrl=${encodeURIComponent(`/${locale}/support`)}`,
    );
  }
  const query = await searchParams;
  const rawType = typeof query.type === "string" ? query.type : undefined;
  const rawTargetType =
    typeof query.targetType === "string" ? query.targetType : undefined;
  const targetId =
    typeof query.targetId === "string" ? query.targetId : undefined;
  const initialType = supportTypes.find((value) => value === rawType);
  const targetType = targetTypes.find((value) => value === rawTargetType);
  const t = await getTranslations("customerSupport");
  const ownCases = await listCustomerSupportCases(actor);

  return (
    <div className="screen-page customer-support-page">
      <header className="customer-support-heading">
        <span className="section-kicker">{t("kicker")}</span>
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </header>
      <CustomerSupportForm
        initialType={initialType}
        targetId={targetType && targetId ? targetId.slice(0, 100) : undefined}
        targetType={targetType && targetId ? targetType : undefined}
      />
      <section className="support-history" aria-labelledby="support-history-heading">
        <h2 id="support-history-heading">내 문의 내역</h2>
        {ownCases.data.length ? <div className="support-history-list">{ownCases.data.map((item) => <article key={item.id}><div><Link href={`/${locale}/support/${item.id}`}><strong>{item.subject}</strong></Link><p>{item.type} · {item.status}</p></div><time dateTime={item.createdAt}>{new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", { dateStyle: "medium" }).format(new Date(item.createdAt))}</time></article>)}</div> : <p>아직 접수한 문의가 없습니다.</p>}
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
