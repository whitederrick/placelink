"use client";

import { ArrowLeft, Check, Clock3, MapPin, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AnalyticsEventOnMount } from "@/features/analytics/components/AnalyticsEventOnMount";
import type { CourseDraft } from "../schema";
import { usePublishCourseDraft } from "../hooks";

export function PublishCourseScreen({
  locale,
  draft,
}: {
  locale: "ko" | "en";
  draft: CourseDraft;
}) {
  const t = useTranslations("create");
  const router = useRouter();
  const defaultTitle =
    locale === "ko" ? `${draft.ownerName} 코스` : `${draft.ownerName}'s course`;
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const publishDraft = usePublishCourseDraft(draft.slug, locale);
  const walkingMinutes = useMemo(
    () =>
      draft.nodes.reduce((total, node) => total + (node.walkMinutes ?? 0), 0),
    [draft.nodes],
  );
  const scheduledDurationMinutes =
    draft.nodes.reduce((total, node) => total + node.durationMinutes, 0) +
    walkingMinutes;
  const hasEveryDay = Array.from(
    { length: draft.dayCount },
    (_, dayOffset) => dayOffset + 1,
  ).every((dayIndex) => draft.nodes.some((node) => node.dayIndex === dayIndex));
  const canPublish =
    draft.nodes.length >= 2 && hasEveryDay && title.trim().length >= 3;
  const publish = () =>
    publishDraft.mutate(
      { title, description: description || null },
      {
        onSuccess: (result) =>
          router.push(
            `/${locale}/courses/${encodeURIComponent(result.data.slug)}?published=1`,
          ),
      },
    );

  return (
    <div className="screen-page create-page publish-page">
      <AnalyticsEventOnMount
        event={{ name: "wizard.step_viewed", properties: { step: 3, locale } }}
      />
      <div className="wizard-head">
        <div>
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{title || defaultTitle}</h1>
        </div>
        <span className="draft-chip">{t("draft")}</span>
      </div>
      <div className="stepper">
        <span className="done">
          <Check size={14} />
        </span>
        <i />
        <span className="done">
          <Check size={14} />
        </span>
        <i />
        <span className="current">3</span>
      </div>
      <div className="step-labels">
        <span>{t("stepAnchor")}</span>
        <span>{t("stepRoute")}</span>
        <strong>{t("stepPublish")}</strong>
      </div>
      <section className="builder-card publish-builder">
        <div className="builder-title">
          <span>{t("publishKicker")}</span>
          <h2>{t("publishTitle")}</h2>
          <p>{t("publishHint")}</p>
        </div>
        <div className="share-card-preview" aria-label={t("previewLabel")}>
          <span>PLACE-LINK · SEOUL</span>
          <div>
            <small>
              {draft.nodes[0]?.place.area?.toUpperCase() ?? "SEOUL"} ·{" "}
              {t("previewStats", {
                days: draft.dayCount,
                stops: draft.nodes.length,
              })}
            </small>
            <strong>{title || defaultTitle}</strong>
            <p>{description || t("previewFallback")}</p>
          </div>
          <footer>
            <span>
              <Clock3 size={13} />
              {t("durationHours", {
                hours: Math.floor(scheduledDurationMinutes / 60),
                minutes: scheduledDurationMinutes % 60,
              })}
            </span>
            <span>
              <MapPin size={13} />
              {draft.nodes[0]?.place.name}
            </span>
          </footer>
        </div>
        <div className="publish-day-summary">
          {Array.from({ length: draft.dayCount }, (_, dayOffset) => {
            const dayIndex = dayOffset + 1;
            const dayNodes = draft.nodes.filter(
              (node) => node.dayIndex === dayIndex,
            );
            return (
              <div key={dayIndex}>
                <strong>{t("dayHeading", { day: dayIndex })}</strong>
                <span>
                  {t("dayPublishSummary", {
                    count: dayNodes.length,
                    start: `${String(Math.floor(draft.dayStartMinutes / 60)).padStart(2, "0")}:${String(draft.dayStartMinutes % 60).padStart(2, "0")}`,
                    end: `${String(Math.floor(draft.dayEndMinutes / 60)).padStart(2, "0")}:${String(draft.dayEndMinutes % 60).padStart(2, "0")}`,
                  })}
                </span>
              </div>
            );
          })}
        </div>
        <label className="publish-field">
          <span>
            {t("courseTitleLabel")}
            <em>{title.length}/60</em>
          </span>
          <input
            value={title}
            maxLength={60}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="publish-field">
          <span>
            {t("courseDescriptionLabel")}
            <em>{description.length}/160</em>
          </span>
          <textarea
            value={description}
            maxLength={160}
            rows={3}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("courseDescriptionPlaceholder")}
          />
        </label>
        <div className="publish-checklist">
          <strong>{t("publishChecklist")}</strong>
          <span>
            <Check size={14} />
            {t("publishStopsReady", { count: draft.nodes.length })}
          </span>
          <span>
            <Check size={14} />
            {t("publishTipsReady")}
          </span>
          <span>
            <Check size={14} />
            {t("publishPublicNotice")}
          </span>
        </div>
        {draft.nodes.length < 2 || !hasEveryDay ? (
          <p className="form-error" role="alert">
            {draft.nodes.length < 2
              ? t("publishMinStops")
              : t("publishMissingDay")}
          </p>
        ) : null}
        {publishDraft.isError ? (
          <p className="form-error" role="alert">
            {t("publishError")}
          </p>
        ) : null}
      </section>
      <div className="builder-summary publish-summary">
        <button
          type="button"
          className="summary-back"
          onClick={() =>
            router.push(
              `/${locale}/create?step=2&draft=${encodeURIComponent(draft.slug)}`,
            )
          }
        >
          <ArrowLeft size={17} />
          {t("backToRoute")}
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={!canPublish || publishDraft.isPending}
        >
          {publishDraft.isPending ? t("publishing") : t("publishCourse")}
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}
