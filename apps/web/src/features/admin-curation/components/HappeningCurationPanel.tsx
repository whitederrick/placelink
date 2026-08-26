"use client";

import { Anchor, CalendarDays, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { HappeningCurationEntry } from "../schema";

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function HappeningCurationPanel({
  initialEntries,
  locale,
}: Readonly<{
  initialEntries: HappeningCurationEntry[];
  locale: string;
}>) {
  const t = useTranslations("curation");
  const [entries, setEntries] = useState(initialEntries);
  const [pendingId, setPendingId] = useState<string>();
  const [errorId, setErrorId] = useState<string>();

  async function toggleAnchor(entry: HappeningCurationEntry) {
    setPendingId(entry.id);
    setErrorId(undefined);
    try {
      const response = await fetch(
        `/api/v1/admin/happenings/${encodeURIComponent(entry.id)}/anchor`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ isAnchor: !entry.isAnchor }),
        },
      );
      if (!response.ok) throw new Error("Anchor update failed");
      const result = (await response.json()) as {
        data: { id: string; isAnchor: boolean };
      };
      setEntries((current) =>
        current.map((item) =>
          item.id === result.data.id
            ? { ...item, isAnchor: result.data.isAnchor }
            : item,
        ),
      );
    } catch {
      setErrorId(entry.id);
    } finally {
      setPendingId(undefined);
    }
  }

  if (!entries.length) {
    return <div className="empty-state">{t("empty")}</div>;
  }

  return (
    <div className="curation-list">
      {entries.map((entry) => (
        <article className={entry.isAnchor ? "is-anchor" : ""} key={entry.id}>
          <div className="curation-card-copy">
            <span className="curation-status">
              {entry.isAnchor ? <Anchor size={14} /> : null}
              {t(`status.${entry.status.toLowerCase()}`)}
              {entry.isAnchor ? ` · ${t("currentlyAnchored")}` : ""}
            </span>
            <h2>{entry.title}</h2>
            <p>
              <MapPin size={14} />
              {entry.placeName}
            </p>
            <p>
              <CalendarDays size={14} />
              {formatDate(entry.startsAt, locale)} –{" "}
              {formatDate(entry.endsAt, locale)}
            </p>
            {errorId === entry.id ? (
              <small role="alert">{t("updateError")}</small>
            ) : null}
          </div>
          <button
            className={entry.isAnchor ? "button ghost" : "button primary"}
            disabled={pendingId === entry.id}
            onClick={() => void toggleAnchor(entry)}
            type="button"
          >
            {pendingId === entry.id
              ? t("updating")
              : entry.isAnchor
                ? t("removeAnchor")
                : t("assignAnchor")}
          </button>
        </article>
      ))}
    </div>
  );
}
