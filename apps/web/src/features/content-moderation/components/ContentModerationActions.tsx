"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ContentModerationActions({ targetType, targetId }: { targetType: "Place" | "Happening" | "Course"; targetId: string }) {
  const router = useRouter(); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function run(action: "HIDE" | "RESTORE") {
    if (reason.trim().length < 3) { setMessage("처리 사유를 3자 이상 입력해 주세요."); return; }
    setBusy(true); setMessage("");
    try { const response = await fetch(`/api/v1/admin/content/${targetType}/${encodeURIComponent(targetId)}/moderation`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reason }) });
      if (!response.ok) throw new Error(); setMessage(action === "HIDE" ? "비공개 처리했습니다." : "공개 상태로 복구했습니다."); router.refresh();
    } catch { setMessage("처리에 실패했습니다. 다시 시도해 주세요."); } finally { setBusy(false); }
  }
  return <section className="studio-panel"><h2>신고 대상 조치</h2><p>사유는 감사 기록에 남습니다.</p><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="처리 사유" /><div className="studio-actions"><button disabled={busy} onClick={() => run("HIDE")} type="button">비공개</button><button disabled={busy} onClick={() => run("RESTORE")} type="button">복구</button></div>{message ? <p aria-live="polite">{message}</p> : null}</section>;
}
