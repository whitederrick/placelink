"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Candidate = { id: string; reason: string; detectedAt: string; primaryPlace: { translations: { name: string }[] }; duplicatePlace: { translations: { name: string }[] } };
export function PlaceMergeCandidateList({ initialCandidates }: { initialCandidates: Candidate[] }) {
  const router = useRouter(); const [items, setItems] = useState(initialCandidates); const [busy, setBusy] = useState<string>();
  async function dismiss(id: string) { const reason = window.prompt("기각 사유를 입력하세요 (3자 이상)"); if (!reason || reason.trim().length < 3) return; setBusy(id); try { const response = await fetch(`/api/v1/admin/place-merge-candidates/${id}/dismiss`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) }); if (!response.ok) throw new Error(); setItems((current) => current.filter((item) => item.id !== id)); router.refresh(); } finally { setBusy(undefined); } }
  if (!items.length) return <div className="empty-state">검토 대기 중인 중복 후보가 없습니다.</div>;
  return <div className="curation-list">{items.map((item) => <article key={item.id}><div className="curation-card-copy"><span className="curation-status">중복 후보</span><h2>{item.primaryPlace.translations[0]?.name ?? item.id} ↔ {item.duplicatePlace.translations[0]?.name ?? item.id}</h2><p>{item.reason}</p><small>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(item.detectedAt))}</small></div><button className="button ghost" disabled={busy === item.id} onClick={() => void dismiss(item.id)} type="button">{busy === item.id ? "처리 중" : "기각"}</button></article>)}</div>;
}
