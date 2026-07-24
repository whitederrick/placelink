"use client";

import { Link2, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCoupleInviteResponseSchema } from "../schema";

interface CoupleControlsProps {
  connected: boolean;
  locale: "ko" | "en";
  labels: {
    invite: string; startedAt: string; upgrade: string; create: string;
    creating: string; copy: string; copied: string; disconnect: string;
    disconnectConfirm: string; error: string;
  };
}

export function CoupleControls({ connected, locale, labels }: CoupleControlsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startedAt, setStartedAt] = useState("");
  const [upgradeSoloCourses, setUpgradeSoloCourses] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function createInvite() {
    setBusy(true); setError(false);
    try {
      const response = await fetch("/api/v1/couples/invites", {
        method: "POST",
        headers: { "content-type": "application/json", "x-locale": locale },
        body: JSON.stringify({ startedAt, upgradeSoloCourses }),
      });
      if (!response.ok) throw new Error("invite failed");
      setInviteUrl(createCoupleInviteResponseSchema.parse(await response.json()).data.inviteUrl);
    } catch { setError(true); } finally { setBusy(false); }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  }

  async function disconnect() {
    if (!window.confirm(labels.disconnectConfirm)) return;
    setBusy(true); setError(false);
    try {
      const response = await fetch("/api/v1/couples/current", { method: "DELETE" });
      if (!response.ok) throw new Error("disconnect failed");
      router.refresh();
    } catch { setError(true); } finally { setBusy(false); }
  }

  if (connected) return (
    <div className="couple-controls">
      <button type="button" className="couple-disconnect" onClick={disconnect} disabled={busy}>
        <Unlink size={16} />{labels.disconnect}
      </button>
      {error ? <small className="couple-error">{labels.error}</small> : null}
    </div>
  );

  return (
    <div className="couple-controls">
      <button type="button" onClick={() => setOpen((value) => !value)}>
        <Link2 size={16} />{labels.invite}
      </button>
      {open ? <div className="couple-invite-form">
        <label>{labels.startedAt}<input type="date" value={startedAt} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setStartedAt(event.target.value)} /></label>
        <label className="couple-check"><input type="checkbox" checked={upgradeSoloCourses} onChange={(event) => setUpgradeSoloCourses(event.target.checked)} />{labels.upgrade}</label>
        {inviteUrl ? <>
          <input aria-label={labels.invite} readOnly value={inviteUrl} />
          <button type="button" onClick={copyInvite}>{copied ? labels.copied : labels.copy}</button>
        </> : <button type="button" onClick={createInvite} disabled={busy || !startedAt}>{busy ? labels.creating : labels.create}</button>}
        {error ? <small className="couple-error">{labels.error}</small> : null}
      </div> : null}
    </div>
  );
}
