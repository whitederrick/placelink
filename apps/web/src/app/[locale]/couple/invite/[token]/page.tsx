import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { CoupleInviteScreen } from "@/features/couples/components/CoupleInviteScreen";
import { coupleInviteTokenSchema } from "@/features/couples";
import { isLocale } from "@/i18n/config";

export default async function CoupleInvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale) || !coupleInviteTokenSchema.safeParse(token).success)
    notFound();
  const t = await getTranslations("couples");
  return (
    <CoupleInviteScreen
      token={token}
      locale={locale}
      labels={{
        loading: t("loading"),
        unavailable: t("unavailable"),
        title: t.raw("title") as string,
        since: t.raw("since") as string,
        upgrade: t("upgradeAccepter"),
        accept: t("accept"),
        accepting: t("accepting"),
        error: t("error"),
        retry: t("retry"),
      }}
    />
  );
}
