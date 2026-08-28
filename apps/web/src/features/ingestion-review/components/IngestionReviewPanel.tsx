"use client";

import { CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  HAPPENING_KINDS,
  OPERATOR_TYPES,
  PLACE_KINDS,
  type IngestionReviewEntry,
} from "../schema";

type ReviewDraft = {
  placeKind: (typeof PLACE_KINDS)[number];
  happeningKind: (typeof HAPPENING_KINDS)[number];
  operatorType: (typeof OPERATOR_TYPES)[number];
  reason: string;
};

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function IngestionReviewPanel({
  initialEntries,
  locale,
}: Readonly<{ initialEntries: IngestionReviewEntry[]; locale: string }>) {
  const t = useTranslations("ingestionReview");
  const [entries, setEntries] = useState(initialEntries);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>(() =>
    Object.fromEntries(
      initialEntries.map((entry) => [
        entry.id,
        {
          placeKind: entry.placeKind ?? "OTHER",
          happeningKind: entry.happeningKind ?? "OTHER",
          operatorType: entry.operatorType ?? "UNKNOWN",
          reason: "",
        },
      ]),
    ),
  );
  const [pendingId, setPendingId] = useState<string>();
  const [errorId, setErrorId] = useState<string>();

  function updateDraft(id: string, change: Partial<ReviewDraft>) {
    setDrafts((current) => {
      const previous = current[id];
      if (!previous) return current;
      return { ...current, [id]: { ...previous, ...change } };
    });
  }

  async function submit(entry: IngestionReviewEntry, decision: "MERGE" | "REJECT") {
    const draft = drafts[entry.id];
    if (!draft || (decision === "REJECT" && draft.reason.trim().length < 3)) {
      setErrorId(entry.id);
      return;
    }
    setPendingId(entry.id);
    setErrorId(undefined);
    try {
      const body =
        decision === "MERGE"
          ? {
              decision,
              placeKind: draft.placeKind,
              happeningKind: draft.happeningKind,
              operatorType: draft.operatorType,
            }
          : { decision, reason: draft.reason.trim() };
      const response = await fetch(
        `/api/v1/admin/ingestions/${encodeURIComponent(entry.id)}/review`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) throw new Error("Review failed");
      setEntries((current) => current.filter((item) => item.id !== entry.id));
    } catch {
      setErrorId(entry.id);
    } finally {
      setPendingId(undefined);
    }
  }

  if (!entries.length) return <div className="empty-state">{t("empty")}</div>;

  return (
    <div className="ingestion-list">
      {entries.map((entry) => {
        const draft = drafts[entry.id];
        return (
          <article key={entry.id}>
            <div className="ingestion-card-copy">
              <span className="curation-status">
                {t(`provider.${entry.provider.toLowerCase()}`)} · {entry.externalId}
              </span>
              <h2>{entry.title ?? entry.externalId}</h2>
              {entry.placeName ? <p><MapPin size={14} />{entry.placeName}{entry.district ? ` · ${entry.district}` : ""}</p> : null}
              {entry.startsAt && entry.endsAt ? <p><CalendarDays size={14} />{formatDate(entry.startsAt, locale)} – {formatDate(entry.endsAt, locale)}</p> : null}
              {entry.scheduleText ? <p>{entry.scheduleText}</p> : null}
              {entry.errorMessage ? <small role="alert">{entry.errorMessage}</small> : null}
              <div className="ingestion-links">
                {entry.officialUrl ? <a href={entry.officialUrl} rel="noreferrer" target="_blank">{t("officialLink")} <ExternalLink size={13} /></a> : null}
                {entry.bookingUrl ? <a href={entry.bookingUrl} rel="noreferrer" target="_blank">{t("bookingLink")} <ExternalLink size={13} /></a> : null}
              </div>
            </div>
            {entry.status === "NORMALIZED" && draft ? (
              <div className="ingestion-review-controls">
                <label>{t("fields.placeKind")}<select value={draft.placeKind} onChange={(event) => updateDraft(entry.id, { placeKind: event.target.value as ReviewDraft["placeKind"] })}>{PLACE_KINDS.map((item) => <option key={item} value={item}>{t(`placeKind.${item.toLowerCase()}`)}</option>)}</select></label>
                <label>{t("fields.happeningKind")}<select value={draft.happeningKind} onChange={(event) => updateDraft(entry.id, { happeningKind: event.target.value as ReviewDraft["happeningKind"] })}>{HAPPENING_KINDS.map((item) => <option key={item} value={item}>{t(`happeningKind.${item.toLowerCase()}`)}</option>)}</select></label>
                <label>{t("fields.operatorType")}<select value={draft.operatorType} onChange={(event) => updateDraft(entry.id, { operatorType: event.target.value as ReviewDraft["operatorType"] })}>{OPERATOR_TYPES.map((item) => <option key={item} value={item}>{t(`operatorType.${item.toLowerCase()}`)}</option>)}</select></label>
                <label>{t("fields.rejectReason")}<input maxLength={300} onChange={(event) => updateDraft(entry.id, { reason: event.target.value })} placeholder={t("rejectPlaceholder")} value={draft.reason} /></label>
                {errorId === entry.id ? <small role="alert">{t("reviewError")}</small> : null}
                <div className="ingestion-actions">
                  <button className="button primary" disabled={pendingId === entry.id} onClick={() => void submit(entry, "MERGE")} type="button">{pendingId === entry.id ? t("reviewing") : t("approve")}</button>
                  <button className="button ghost" disabled={pendingId === entry.id} onClick={() => void submit(entry, "REJECT")} type="button">{t("reject")}</button>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
