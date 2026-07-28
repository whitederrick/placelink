"use client";

import { Bookmark, Link2, Plus, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { trackAnalyticsEvent } from "@/features/analytics/client";
import { useCourseScrap } from "@/features/scraps/client";

export function CourseScrapMetric({
  slug,
  initialScrapCount,
}: {
  slug: string;
  initialScrapCount: number;
}) {
  const t = useTranslations("course");
  const scrap = useCourseScrap(slug, initialScrapCount);
  return <span>{t("scraps", { count: scrap.status.scrapCount })}</span>;
}

export function CourseShareActions({
  locale,
  title,
  slug,
  initialScrapCount,
}: {
  locale: "ko" | "en";
  title: string;
  slug: string;
  initialScrapCount: number;
}) {
  const t = useTranslations("course");
  const [copied, setCopied] = useState(false);
  const scrap = useCourseScrap(slug, initialScrapCount);
  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href });
      trackAnalyticsEvent("course.shared", {
        courseSlug: slug,
        locale,
        method: "native",
      });
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    trackAnalyticsEvent("course.shared", {
      courseSlug: slug,
      locale,
      method: "clipboard",
    });
  };
  const toggleScrap = () => {
    if (scrap.status.signedIn === false) {
      window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`;
      return;
    }
    scrap.mutation.mutate(!scrap.status.scrapped);
  };
  return (
    <div className="detail-actions course-detail-actions">
      <button
        className="square-action"
        type="button"
        aria-label={t("shareLabel")}
        onClick={() => void share()}
      >
        {copied ? <Link2 size={20} /> : <Share2 size={20} />}
      </button>
      <button
        className={`scrap-action ${scrap.status.scrapped ? "active" : ""}`}
        type="button"
        onClick={toggleScrap}
        disabled={scrap.isLoading || scrap.mutation.isPending}
        aria-pressed={scrap.status.scrapped}
      >
        <Bookmark
          size={18}
          fill={scrap.status.scrapped ? "currentColor" : "none"}
        />
        {scrap.status.signedIn === false
          ? t("signInToSave")
          : scrap.status.scrapped
            ? t("savedCourse")
            : t("save")}
        <span>{scrap.status.scrapCount}</span>
      </button>
      <a
        className="make-course-action"
        href={`/${locale}/create`}
        aria-label={t("makeCourse")}
      >
        <Plus size={19} />
      </a>
    </div>
  );
}
