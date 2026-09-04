"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  customerSupportCaseRequestSchema,
  customerSupportCaseResponseSchema,
} from "../schema";

type SupportType = "INQUIRY" | "COMPLAINT" | "REPORT" | "PRIVACY";
type TargetType = "Course" | "Place" | "Happening";

export function CustomerSupportForm({
  initialType = "INQUIRY",
  targetType,
  targetId,
}: {
  initialType?: SupportType;
  targetType?: TargetType;
  targetId?: string;
}) {
  const t = useTranslations("customerSupport");
  const [type, setType] = useState<SupportType>(initialType);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = customerSupportCaseRequestSchema.safeParse({
        type,
        subject,
        description,
        ...(targetType && targetId ? { targetType, targetId } : {}),
      });
      if (!payload.success) {
        setError(t("error"));
        return;
      }
      const response = await fetch("/api/v1/support-cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload.data),
      });
      if (!response.ok) {
        setError(response.status === 429 ? t("rateLimited") : t("error"));
        return;
      }
      const result = customerSupportCaseResponseSchema.parse(
        await response.json(),
      );
      setCaseId(result.data.id);
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  if (caseId) {
    return (
      <section className="customer-support-success" aria-live="polite">
        <CheckCircle2 size={38} />
        <span className="section-kicker">{t("successKicker")}</span>
        <h2>{t("successTitle")}</h2>
        <p>{t("successBody")}</p>
        <small>{t("reference", { id: caseId })}</small>
      </section>
    );
  }

  return (
    <form className="customer-support-form" onSubmit={submit}>
      <fieldset>
        <legend>{t("typeLabel")}</legend>
        <div className="support-type-options">
          {(["INQUIRY", "COMPLAINT", "REPORT", "PRIVACY"] as const).map(
            (value) => (
              <label key={value}>
                <input
                  checked={type === value}
                  name="type"
                  onChange={() => setType(value)}
                  type="radio"
                  value={value}
                />
                <span>{t(`types.${value.toLowerCase()}`)}</span>
              </label>
            ),
          )}
        </div>
      </fieldset>
      {targetType && targetId ? (
        <div className="support-target-note">
          <strong>{t("targetLabel")}</strong>
          <span>{t(`targets.${targetType.toLowerCase()}`)}</span>
        </div>
      ) : null}
      <label>
        <span>{t("subjectLabel")}</span>
        <input
          autoComplete="off"
          maxLength={120}
          minLength={3}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={t("subjectPlaceholder")}
          required
          value={subject}
        />
        <small>{subject.length}/120</small>
      </label>
      <label>
        <span>{t("descriptionLabel")}</span>
        <textarea
          maxLength={3000}
          minLength={10}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("descriptionPlaceholder")}
          required
          rows={8}
          value={description}
        />
        <small>{description.length}/3000</small>
      </label>
      <p className="support-privacy-note">{t("privacyNote")}</p>
      {error ? (
        <p className="support-submit-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button primary" disabled={busy} type="submit">
        <Send size={17} />
        {busy ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
