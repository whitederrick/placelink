import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { isLocale } from "@/i18n/config";
import { webEnv } from "@/lib/env";

export default async function StudioPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const [{ locale }, session, t] = await Promise.all([
    params,
    auth(),
    getTranslations("studioAccess"),
  ]);
  if (!isLocale(locale)) notFound();

  const actor = session?.user?.id
    ? await loadHumanActor(session.user.id)
    : null;
  if (actor?.role === "ADMIN") redirect(`/${locale}/studio/ingestions`);

  const callbackUrl = `/${locale}/studio`;
  const signInHref = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const configured = webEnv.STUDIO_OPERATOR_EMAILS.length > 0;

  return (
    <div className="screen-page studio-access-page">
      <section className="studio-access-card">
        <span className="section-kicker">{t("kicker")}</span>
        <h1>{t("title")}</h1>
        <p>
          {session?.user
            ? t("forbidden")
            : configured
              ? t("body")
              : t("unavailable")}
        </p>
        {!session?.user && configured ? (
          <Link className="button primary" href={signInHref}>
            {t("signIn")}
          </Link>
        ) : null}
        <Link className="button ghost" href={`/${locale}`}>
          {t("backHome")}
        </Link>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
