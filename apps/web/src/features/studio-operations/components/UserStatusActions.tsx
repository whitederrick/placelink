"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface Labels {
  title: string;
  body: string;
  status: string;
  suspendedUntil: string;
  reason: string;
  save: string;
  saving: string;
  saved: string;
  error: string;
  statuses: Record<string, string>;
}

export function UserStatusActions({
  userId,
  current,
  labels,
  allowWithdrawal,
}: Readonly<{
  userId: string;
  current: { status: string; updatedAt: string; suspendedUntil: string | null };
  labels: Labels;
  allowWithdrawal: boolean;
}>) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [updatedAt, setUpdatedAt] = useState(current.updatedAt);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status"));
    const until = String(form.get("suspendedUntil") ?? "");
    const response = await fetch(
      `/api/v1/admin/users/${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          reason: form.get("reason"),
          suspendedUntil:
            status === "SUSPENDED"
              ? until
                ? new Date(until).toISOString()
                : null
              : undefined,
          expectedUpdatedAt: updatedAt,
        }),
      },
    );
    if (!response.ok) return setState("error");
    const payload = await response.json();
    setUpdatedAt(payload.data.updatedAt);
    setState("saved");
    router.refresh();
  }

  return (
    <form className="studio-panel support-update-form" onSubmit={submit}>
      <h2>{labels.title}</h2>
      <p>{labels.body}</p>
      <div className="support-form-grid">
        <label>
          {labels.status}
          <select defaultValue={current.status} name="status">
            {Object.entries(labels.statuses)
              .filter(([value]) => allowWithdrawal || value !== "WITHDRAWN")
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
        </label>
        <label>
          {labels.suspendedUntil}
          <input name="suspendedUntil" type="datetime-local" />
        </label>
      </div>
      <label>
        {labels.reason}
        <input minLength={3} maxLength={500} name="reason" required />
      </label>
      <button
        className="button primary"
        disabled={state === "saving"}
        type="submit"
      >
        {state === "saving" ? labels.saving : labels.save}
      </button>
      <p aria-live="polite">
        {state === "saved"
          ? labels.saved
          : state === "error"
            ? labels.error
            : ""}
      </p>
    </form>
  );
}
