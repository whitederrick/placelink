import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { QueryProvider } from "@/components/QueryProvider";
import { isLocale, locales } from "@/i18n/config";
import { getLocalizedAlternates } from "@/lib/site-url";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const languages = getLocalizedAlternates();

  return {
    alternates: {
      canonical: languages[locale],
      languages,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <QueryProvider>
        <AppShell locale={locale}>{children}</AppShell>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
