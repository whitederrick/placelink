"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface Labels {
  save: string;
  saving: string;
  saved: string;
  updateError: string;
  status: string;
  priority: string;
  assignment: string;
  keepAssignment: string;
  assignSelf: string;
  unassign: string;
  dueAt: string;
  reason: string;
  reasonPlaceholder: string;
  entryKind: string;
  staffReply: string;
  internalNote: string;
  entryBody: string;
  entryPlaceholder: string;
  addEntry: string;
  addingEntry: string;
  entryAdded: string;
  entryError: string;
  statuses: Record<string, string>;
  priorities: Record<string, string>;
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function SupportCaseActions({
  caseId,
  current,
  labels,
}: Readonly<{
  caseId: string;
  current: {
    status: string;
    priority: string;
    dueAt: string | null;
    updatedAt: string;
  };
  labels: Labels;
}>) {
  const router = useRouter();
  const [updatedAt, setUpdatedAt] = useState(current.updatedAt);
  const [updateState, setUpdateState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [entryState, setEntryState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  async function updateCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setUpdateState("saving");
    const form = new FormData(formElement);
    const dueAt = String(form.get("dueAt") ?? "");
    const response = await fetch(`/api/v1/admin/support-cases/${caseId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: form.get("status"),
        priority: form.get("priority"),
        assignment:
          form.get("assignment") === "KEEP"
            ? undefined
            : form.get("assignment"),
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        reason: form.get("reason"),
        expectedUpdatedAt: updatedAt,
      }),
    });
    if (!response.ok) {
      setUpdateState("error");
      return;
    }
    const payload = await response.json();
    setUpdatedAt(payload.data.updatedAt);
    setUpdateState("saved");
    const reason = formElement.elements.namedItem("reason");
    if (reason instanceof HTMLInputElement) reason.value = "";
    router.refresh();
  }

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setEntryState("saving");
    const form = new FormData(formElement);
    const response = await fetch(
      `/api/v1/admin/support-cases/${caseId}/entries`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: form.get("kind"),
          body: form.get("body"),
        }),
      },
    );
    if (!response.ok) {
      setEntryState("error");
      return;
    }
    const payload = await response.json();
    setUpdatedAt(payload.data.caseUpdatedAt);
    setEntryState("saved");
    formElement.reset();
    router.refresh();
  }

  return (
    <div className="support-actions">
      <form className="studio-panel support-update-form" onSubmit={updateCase}>
        <h2>{labels.save}</h2>
        <div className="support-form-grid">
          <label>
            {labels.status}
            <select defaultValue={current.status} name="status">
              {Object.entries(labels.statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels.priority}
            <select defaultValue={current.priority} name="priority">
              {Object.entries(labels.priorities).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels.assignment}
            <select defaultValue="KEEP" name="assignment">
              <option value="KEEP">{labels.keepAssignment}</option>
              <option value="SELF">{labels.assignSelf}</option>
              <option value="UNASSIGNED">{labels.unassign}</option>
            </select>
          </label>
          <label>
            {labels.dueAt}
            <input
              defaultValue={localDateTime(current.dueAt)}
              name="dueAt"
              type="datetime-local"
            />
          </label>
        </div>
        <label>
          {labels.reason}
          <input
            minLength={3}
            name="reason"
            placeholder={labels.reasonPlaceholder}
            required
          />
        </label>
        <button
          className="button primary"
          disabled={updateState === "saving"}
          type="submit"
        >
          {updateState === "saving" ? labels.saving : labels.save}
        </button>
        <p aria-live="polite">
          {updateState === "saved"
            ? labels.saved
            : updateState === "error"
              ? labels.updateError
              : ""}
        </p>
      </form>
      <form className="studio-panel support-entry-form" onSubmit={addEntry}>
        <h2>{labels.addEntry}</h2>
        <label>
          {labels.entryKind}
          <select name="kind">
            <option value="STAFF_REPLY">{labels.staffReply}</option>
            <option value="INTERNAL_NOTE">{labels.internalNote}</option>
          </select>
        </label>
        <label>
          {labels.entryBody}
          <textarea
            minLength={3}
            name="body"
            placeholder={labels.entryPlaceholder}
            required
            rows={5}
          />
        </label>
        <button
          className="button primary"
          disabled={entryState === "saving"}
          type="submit"
        >
          {entryState === "saving" ? labels.addingEntry : labels.addEntry}
        </button>
        <p aria-live="polite">
          {entryState === "saved"
            ? labels.entryAdded
            : entryState === "error"
              ? labels.entryError
              : ""}
        </p>
      </form>
    </div>
  );
}
