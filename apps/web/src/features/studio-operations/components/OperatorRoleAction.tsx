"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OperatorRoleAction({
  operator,
  labels,
}: Readonly<{
  operator: { id: string; studioRole: string | null; updatedAt: string };
  labels: {
    role: string;
    reason: string;
    save: string;
    saving: string;
    saved: string;
    error: string;
    none: string;
    roles: Record<string, string>;
  };
}>) {
  const router = useRouter();
  const [updatedAt, setUpdatedAt] = useState(operator.updatedAt);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    const form = new FormData(event.currentTarget);
    const role = String(form.get("studioRole") ?? "");
    const response = await fetch(
      `/api/v1/admin/operators/${encodeURIComponent(operator.id)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studioRole: role || null,
          reason: form.get("reason"),
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
    <form className="support-update-form" onSubmit={submit}>
      <label>
        {labels.role}
        <select defaultValue={operator.studioRole ?? ""} name="studioRole">
          <option value="">{labels.none}</option>
          {Object.entries(labels.roles).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
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
      <small aria-live="polite">
        {state === "saved"
          ? labels.saved
          : state === "error"
            ? labels.error
            : ""}
      </small>
    </form>
  );
}
