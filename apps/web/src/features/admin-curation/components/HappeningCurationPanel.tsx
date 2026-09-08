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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function bulkVisibility() {
    const selected = entries.filter((entry) => selectedIds.includes(entry.id));
    if (!selected.length) return;
    const hide = selected.some((entry) => entry.status !== "HIDDEN");
    const action = hide ? "HIDE" : "RESTORE";
    const reason = window.prompt(hide ? "선택한 행사를 비공개 처리할 사유를 입력하세요" : "선택한 행사를 복구할 사유를 입력하세요");
    if (!reason || reason.trim().length < 3) return;
    if (!window.confirm(`${selected.length}개 행사를 ${hide ? "비공개" : "복구"} 처리할까요?`)) return;
    setBulkBusy(true); setErrorId(undefined);
    try {
      const updatedStatuses = new Map<string, HappeningCurationEntry["status"]>();
      for (const entry of selected) {
        const response = await fetch(`/api/v1/admin/content/HAPPENING/${encodeURIComponent(entry.id)}/moderation`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reason }) });
        if (!response.ok) throw new Error("Bulk visibility update failed");
        const result = (await response.json()) as { data: { status: HappeningCurationEntry["status"] } };
        updatedStatuses.set(entry.id, result.data.status);
      }
      setEntries((current) => current.map((entry) => updatedStatuses.has(entry.id) ? { ...entry, status: updatedStatuses.get(entry.id)!, isAnchor: hide ? false : entry.isAnchor } : entry));
      setSelectedIds([]);
    } catch { setErrorId("bulk"); } finally { setBulkBusy(false); }
  }

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

  async function toggleVisibility(entry: HappeningCurationEntry) {
    setPendingId(entry.id); setErrorId(undefined);
    try {
      const action = entry.status === "HIDDEN" ? "RESTORE" : "HIDE";
      const reason = window.prompt(action === "HIDE" ? "비공개 사유를 입력하세요" : "복구 사유를 입력하세요");
      if (!reason || reason.trim().length < 3) return;
      const response = await fetch(`/api/v1/admin/content/HAPPENING/${encodeURIComponent(entry.id)}/moderation`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reason }) });
      if (!response.ok) throw new Error("Visibility update failed");
      const result = (await response.json()) as { data: { status: HappeningCurationEntry["status"] } };
      setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, status: result.data.status, isAnchor: result.data.status === "HIDDEN" ? false : item.isAnchor } : item));
    } catch { setErrorId(entry.id); } finally { setPendingId(undefined); }
  }

  if (!entries.length) {
    return <div className="empty-state">{t("empty")}</div>;
  }

  return (
    <div className="curation-list">
      <div className="button-row">
        <button className="button ghost" disabled={!selectedIds.length || bulkBusy} onClick={() => void bulkVisibility()} type="button">{bulkBusy ? "일괄 처리 중" : `선택 항목 공개 상태 변경 (${selectedIds.length})`}</button>
        {errorId === "bulk" ? <small role="alert">일괄 처리에 실패했습니다. 일부 항목만 변경되었을 수 있습니다.</small> : null}
      </div>
      {entries.map((entry) => (
        <article className={entry.isAnchor ? "is-anchor" : ""} key={entry.id}>
          <div className="curation-card-copy">
            <label><input aria-label={`${entry.title} 선택`} checked={selectedIds.includes(entry.id)} onChange={() => toggleSelected(entry.id)} type="checkbox" /> 선택</label>
            <span className="curation-status">
              {entry.isAnchor ? <Anchor size={14} /> : null}
              {t(`status.${entry.status.toLowerCase()}`)}
              {entry.isAnchor ? ` · ${t("currentlyAnchored")}` : ""}
            </span>
            <h2><a href={`/${locale}/studio/happenings/${encodeURIComponent(entry.id)}`}>{entry.title}</a></h2>
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
          <div className="button-row"><button
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
          </button><button className="button ghost" disabled={pendingId === entry.id} onClick={() => void toggleVisibility(entry)} type="button">{entry.status === "HIDDEN" ? "공개 복구" : "비공개"}</button></div>
        </article>
      ))}
    </div>
  );
}
