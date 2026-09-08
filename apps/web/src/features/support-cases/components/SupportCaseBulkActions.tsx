"use client";

import { useState } from "react";

type CaseItem = { id: string; updatedAt: string };

export function SupportCaseBulkActions({ items }: { items: CaseItem[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function assignToSelf() {
    const targets = items.filter((item) => selected.includes(item.id));
    if (!targets.length) return;
    setBusy(true); setMessage("");
    let completed = 0;
    try {
      for (const target of targets) {
        const response = await fetch(`/api/v1/admin/support-cases/${encodeURIComponent(target.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ assignment: "SELF", reason: "일괄 배정", expectedUpdatedAt: target.updatedAt }) });
        if (response.ok) completed += 1;
      }
      setMessage(`${completed}/${targets.length}건을 내 작업으로 배정했습니다.`);
      setSelected([]);
    } finally { setBusy(false); }
  }
  return <section className="studio-panel"><div className="button-row"><button className="button ghost" disabled={busy || !selected.length} onClick={() => void assignToSelf()} type="button">{busy ? "배정 중" : `내 작업으로 일괄 배정 (${selected.length})`}</button>{message ? <small aria-live="polite">{message}</small> : null}</div><div className="support-bulk-selection">{items.map((item) => <label key={item.id}><input aria-label={`${item.id} 선택`} checked={selected.includes(item.id)} onChange={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} type="checkbox" /> {item.id}</label>)}</div></section>;
}
