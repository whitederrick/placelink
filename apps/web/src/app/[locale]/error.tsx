"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ErrorPage({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  const t = useTranslations("common");
  return (
    <div className="error-screen">
      <span>500 / LINK LOST</span>
      <h1>{t("errorTitle")}</h1>
      <p>{t("errorBody")}</p>
      <button className="button primary" onClick={reset} type="button"><RotateCcw size={17} />{t("retry")}</button>
    </div>
  );
}
