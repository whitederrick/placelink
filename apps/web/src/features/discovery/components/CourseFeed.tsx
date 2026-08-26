"use client";

import { Bookmark, Clock3, Eye, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import type { Locale } from "@/i18n/config";
import { useHomeFeed } from "../hooks";
import type { CourseCard, HomeFeedQuery, HomeFeedResponse } from "../schema";

function CourseFeedCard({
  course,
  index,
  locale,
}: Readonly<{ course: CourseCard; index: number; locale: Locale }>) {
  const t = useTranslations("home");
  return (
    <Link className="course-card" href={`/${locale}/courses/${course.slug}`}>
      <div className={`course-cover ${course.tone}`}>
        <span className="cover-number">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="cover-place">{course.neighborhood}</span>
        <span className="bookmark-button" aria-hidden="true">
          <Bookmark size={18} />
        </span>
        <div className="cover-route">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="course-copy">
        <div className="course-owner">
          <span>{course.coupleName}</span>
          <small>{t("courseSuffix")}</small>
        </div>
        <div className="course-stats">
          <span>
            <Clock3 size={14} />
            {course.duration}
          </span>
          <span>{t("stops", { count: course.stops })}</span>
          <span>{t("scraps", { count: course.scraps })}</span>
          <span>
            <Eye size={14} />
            {course.views}
          </span>
        </div>
        <div className="tag-row">
          {course.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export function CourseFeed({
  initialPage,
  locale,
  filters,
}: Readonly<{
  initialPage: HomeFeedResponse;
  locale: Locale;
  filters: Omit<HomeFeedQuery, "cursor">;
}>) {
  const t = useTranslations("home");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
  } = useHomeFeed(filters, initialPage);
  const courses = useMemo(() => {
    const uniqueCourses = new Map<string, CourseCard>();
    for (const page of data.pages) {
      for (const course of page.data.courses) {
        uniqueCourses.set(course.slug, course);
      }
    }
    return [...uniqueCourses.values()];
  }, [data.pages]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <>
      <div className="course-grid">
        {courses.map((course, index) => (
          <CourseFeedCard
            course={course}
            index={index}
            key={course.slug}
            locale={locale}
          />
        ))}
      </div>
      <div
        aria-live="polite"
        className="feed-pagination-state"
        ref={loadMoreRef}
      >
        {isFetchingNextPage ? (
          <span>
            <LoaderCircle aria-hidden="true" size={18} />
            {t("loadingMore")}
          </span>
        ) : null}
        {isFetchNextPageError ? (
          <button type="button" onClick={() => void fetchNextPage()}>
            {t("loadMoreRetry")}
          </button>
        ) : null}
        {!hasNextPage && courses.length > 0 ? (
          <small>{t("feedEnd")}</small>
        ) : null}
      </div>
    </>
  );
}
