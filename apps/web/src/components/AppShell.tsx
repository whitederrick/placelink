"use client";

import { Compass, Home, Plus, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { BrandMark } from "./BrandMark";

const navigationItems = [
  { key: "home", path: "", icon: Home },
  { key: "explore", path: "/explore", icon: Compass },
  { key: "create", path: "/create", icon: Plus },
  { key: "my", path: "/my", icon: UserRound }
] as const;

export function AppShell({ children, locale }: Readonly<{ children: React.ReactNode; locale: Locale }>) {
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const otherLocale = locale === "ko" ? "en" : "ko";
  const localePath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  return (
    <div className="site-canvas">
      <header className="topbar">
        <Link className="wordmark" href={`/${locale}`} aria-label={t("brandLabel")}>
          <BrandMark />
          <span>place-link</span>
        </Link>
        <Link className="locale-switch" href={localePath}>
          {otherLocale.toUpperCase()}
        </Link>
      </header>
      <main className="main-content">{children}</main>
      <nav className="tabbar" aria-label={t("label")}>
        {navigationItems.map(({ key, path, icon: Icon }) => {
          const href = `/${locale}${path}`;
          const isActive = path === "" ? pathname === `/${locale}` : pathname.startsWith(href);
          return (
            <Link className={isActive ? "tab-item active" : "tab-item"} href={href} key={key}>
              <span className={key === "create" ? "create-icon" : "tab-icon"}>
                <Icon size={key === "create" ? 23 : 20} strokeWidth={2.2} />
              </span>
              <span>{t(key)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
