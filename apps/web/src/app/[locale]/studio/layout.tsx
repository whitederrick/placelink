import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { isLocale } from "@/i18n/config";

export default async function StudioLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const [{ locale }, session, t] = await Promise.all([
    params,
    auth(),
    getTranslations("studioNav"),
  ]);
  if (!isLocale(locale)) notFound();
  const actor = session?.user?.id
    ? await loadHumanActor(session.user.id)
    : null;
  if (actor?.role !== "ADMIN") return children;

  const links = [
    { href: `/${locale}/studio`, label: t("dashboard") },
    { href: `/${locale}/studio/users`, label: t("users") },
    { href: `/${locale}/studio/support`, label: t("support") },
    { href: `/${locale}/studio/runs`, label: t("runs") },
    { href: `/${locale}/studio/ingestions`, label: t("ingestions") },
    { href: `/${locale}/studio/happenings`, label: t("happenings") },
    { href: `/${locale}/studio/analytics`, label: t("analytics") },
  ];
  const future = [t("partners"), t("campaigns"), t("revenue")];

  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <Link className="studio-brand" href={`/${locale}/studio`}>
          <small>PLACE-LINK</small>
          <strong>{t("title")}</strong>
        </Link>
        <nav aria-label={t("primaryLabel")}>
          <span className="studio-nav-heading">{t("operations")}</span>
          {links.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
          <span className="studio-nav-heading">{t("business")}</span>
          {future.map((label) => (
            <span className="studio-nav-future" key={label}>
              {label}
              <small>{t("planned")}</small>
            </span>
          ))}
        </nav>
        <Link className="studio-back-link" href={`/${locale}`}>
          {t("backToService")}
        </Link>
      </aside>
      <main className="studio-main">{children}</main>
    </div>
  );
}
