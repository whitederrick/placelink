"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ContentModerationActions } from "@/features/content-moderation/components/ContentModerationActions";

export function HappeningDetailActions({ id, isAnchor, status }: { id: string; isAnchor: boolean; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function toggleAnchor() {
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/admin/happenings/${encodeURIComponent(id)}/anchor`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isAnchor: !isAnchor }) });
      if (!response.ok) throw new Error();
      router.refresh();
    } finally { setBusy(false); }
  }
  return <><section className="studio-panel"><h2>운영 조치</h2><button className="button" disabled={busy || status === "HIDDEN"} onClick={() => void toggleAnchor()} type="button">{isAnchor ? "앵커 해제" : "홈 앵커 지정"}</button>{status === "HIDDEN" ? <p>비공개 행사에는 앵커를 지정할 수 없습니다.</p> : null}</section><ContentModerationActions targetType="Happening" targetId={id} /></>;
}
