import { HomeScreen, loadHomeFeed } from "@/features/discovery";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

export default async function HomePage({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { data: feed } = await loadHomeFeed(locale);
  return <HomeScreen feed={feed} locale={locale} />;
}

export const revalidate = 300;
