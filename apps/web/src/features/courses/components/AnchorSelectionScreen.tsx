"use client";

import { ArrowRight, CalendarDays, Check, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnalyticsEventOnMount } from "@/features/analytics/components/AnalyticsEventOnMount";
import type { CourseAnchor } from "../schema";
import { useCreateCourseDraft } from "../hooks";

interface AnchorSelectionScreenProps {
  locale: "ko" | "en";
  anchors: CourseAnchor[];
  signedIn: boolean;
}

export function AnchorSelectionScreen({
  locale,
  anchors,
  signedIn,
}: AnchorSelectionScreenProps) {
  const t = useTranslations("create");
  const router = useRouter();
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(
    anchors[0]?.happeningId ?? null,
  );
  const createDraft = useCreateCourseDraft();
  const selectedAnchor = anchors.find(
    (anchor) => anchor.happeningId === selectedAnchorId,
  );
  const callbackUrl = `/${locale}/create`;

  return (
    <div className="screen-page create-page">
      <AnalyticsEventOnMount
        event={{ name: "wizard.step_viewed", properties: { step: 1, locale } }}
      />
      <div className="wizard-head">
        <div>
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{t("title")}</h1>
        </div>
        <span className="draft-chip">
          {createDraft.data ? t("draft") : t("newCourse")}
        </span>
      </div>
      <div className="stepper">
        <span className="current">1</span>
        <i />
        <span>2</span>
        <i />
        <span>3</span>
      </div>
      <div className="step-labels">
        <strong>{t("stepAnchor")}</strong>
        <span>{t("stepRoute")}</span>
        <span>{t("stepPublish")}</span>
      </div>
      <section className="builder-card anchor-builder">
        <div className="builder-title">
          <span>{t("anchorKicker")}</span>
          <h2>{t("anchorTitle")}</h2>
          <p>{t("anchorHint")}</p>
        </div>
        {anchors.length === 0 ? (
          <div className="empty-state">
            <strong>{t("anchorEmptyTitle")}</strong>
            <p>{t("anchorEmptyBody")}</p>
          </div>
        ) : (
          <div className="anchor-choice-list">
            {anchors.map((anchor, index) => {
              const selected = anchor.happeningId === selectedAnchorId;
              return (
                <button
                  className={`anchor-choice ${selected ? "selected" : ""}`}
                  type="button"
                  onClick={() => setSelectedAnchorId(anchor.happeningId)}
                  key={anchor.happeningId}
                >
                  <span className="anchor-choice-index">
                    {selected ? (
                      <Check size={15} />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <span className="anchor-choice-copy">
                    <small>{anchor.dDay}</small>
                    <strong>{anchor.title}</strong>
                    <em>
                      <MapPin size={12} />
                      {anchor.place.name}
                    </em>
                    <em>
                      <CalendarDays size={12} />
                      {anchor.period}
                    </em>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
      {createDraft.data ? (
        <div className="draft-success">
          <Check size={18} />
          <div>
            <strong>{t("draftCreated")}</strong>
            <span>{createDraft.data.data.title}</span>
          </div>
        </div>
      ) : null}
      {createDraft.isError ? (
        <p className="form-error" role="alert">
          {t("draftError")}
        </p>
      ) : null}
      <div className="builder-summary anchor-summary">
        <span>
          {selectedAnchor ? selectedAnchor.place.name : t("selectAnchor")}
        </span>
        {signedIn ? (
          <button
            type="button"
            disabled={
              !selectedAnchorId ||
              createDraft.isPending ||
              Boolean(createDraft.data)
            }
            onClick={() =>
              selectedAnchorId &&
              createDraft.mutate(
                { locale, anchorHappeningId: selectedAnchorId },
                {
                  onSuccess: (result) =>
                    router.push(
                      `/${locale}/create?step=2&draft=${encodeURIComponent(result.data.slug)}`,
                    ),
                },
              )
            }
          >
            {createDraft.isPending
              ? t("savingDraft")
              : createDraft.data
                ? t("savedDraft")
                : t("createDraft")}
            <ArrowRight size={18} />
          </button>
        ) : (
          <a
            className="summary-link"
            href={`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            {t("signInToCreate")}
            <ArrowRight size={18} />
          </a>
        )}
      </div>
    </div>
  );
}
