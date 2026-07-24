"use client";

import { BrandMark } from "@/components/BrandMark";
import { useTranslations } from "next-intl";

export default function LoadingPage() {
  const t = useTranslations("common");
  return (
    <div className="loading-screen" role="status" aria-label={t("loading")}>
      <BrandMark />
      <span className="loading-line" />
      <span className="loading-line short" />
      <div className="loading-card" />
    </div>
  );
}
