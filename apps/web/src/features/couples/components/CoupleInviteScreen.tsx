"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  buildCoupleInviteSignInUrl,
  fetchCoupleInvitePreview,
  submitCoupleInviteAcceptance,
} from "../client";

interface Props {
  token: string;
  locale: "ko" | "en";
  labels: {
    loading: string;
    unavailable: string;
    title: string;
    since: string;
    upgrade: string;
    accept: string;
    accepting: string;
    error: string;
    retry: string;
  };
}

export function CoupleInviteScreen({ token, locale, labels }: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<{
    inviterNickname: string;
    startedAt: string;
  } | null>(null);
  const [previewState, setPreviewState] = useState<
    "loading" | "unavailable" | "retryable" | "ready"
  >("loading");
  const [upgradeSoloCourses, setUpgradeSoloCourses] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchCoupleInvitePreview(token).then((result) => {
      if (!active) return;
      if (result.kind === "ready") {
        setPreview(result.data);
        setPreviewState("ready");
        return;
      }
      setPreview(null);
      setPreviewState(result.kind);
    });
    return () => {
      active = false;
    };
  }, [token]);

  async function retryPreview() {
    setPreviewState("loading");
    const result = await fetchCoupleInvitePreview(token);
    if (result.kind === "ready") {
      setPreview(result.data);
      setPreviewState("ready");
      return;
    }
    setPreview(null);
    setPreviewState(result.kind);
  }

  async function accept() {
    setBusy(true);
    setError(false);
    const result = await submitCoupleInviteAcceptance(
      token,
      upgradeSoloCourses,
    );
    if (result === "unauthorized") {
      window.location.href = buildCoupleInviteSignInUrl(locale, token);
      return;
    }
    if (result === "rejected") {
      setError(true);
      setBusy(false);
      return;
    }
    router.push(`/${locale}/my`);
    router.refresh();
  }

  return (
    <div className="screen-page couple-invite-page">
      <Heart size={42} fill="currentColor" />
      {previewState === "unavailable" ? (
        <h1>{labels.unavailable}</h1>
      ) : previewState === "retryable" ? (
        <>
          <p>{labels.error}</p>
          <button type="button" onClick={() => void retryPreview()}>
            {labels.retry}
          </button>
        </>
      ) : previewState === "loading" || !preview ? (
        <p>{labels.loading}</p>
      ) : (
        <>
          <span className="section-kicker">COUPLE INVITE</span>
          <h1>{labels.title.replace("{name}", preview.inviterNickname)}</h1>
          <p>
            {labels.since.replace(
              "{date}",
              new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
                new Date(preview.startedAt),
              ),
            )}
          </p>
          <label className="couple-check">
            <input
              type="checkbox"
              checked={upgradeSoloCourses}
              onChange={(event) => setUpgradeSoloCourses(event.target.checked)}
            />
            {labels.upgrade}
          </label>
          <button type="button" onClick={accept} disabled={busy}>
            {busy ? labels.accepting : labels.accept}
          </button>
          {error ? (
            <small className="couple-error">{labels.error}</small>
          ) : null}
        </>
      )}
    </div>
  );
}
