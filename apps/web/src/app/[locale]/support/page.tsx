import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { CustomerSupportForm } from "@/features/support-cases/components/CustomerSupportForm";
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
    </div>
  );
}

export const dynamic = "force-dynamic";
