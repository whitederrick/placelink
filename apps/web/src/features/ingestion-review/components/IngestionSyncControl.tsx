"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SyncResult {
  provider: "SEOUL_OPEN_DATA" | "CULTURE_PORTAL";
  fetched: number;
  selected: number;
  inserted: number;
  unchanged: number;
}

export function IngestionSyncControl({
  fromDate,
}: Readonly<{ fromDate: string }>) {
  const t = useTranslations("ingestionReview");
  const router = useRouter();
  const [from, setFrom] = useState(fromDate);
  const [provider, setProvider] =
    useState<SyncResult["provider"]>("SEOUL_OPEN_DATA");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SyncResult>();
  const [error, setError] = useState(false);

  async function synchronize() {
    setPending(true);
    setError(false);
    setResult(undefined);
    try {
      const response = await fetch("/api/v1/admin/ingestions/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, start: 1, end: 100, from }),
      });
      if (!response.ok) throw new Error("Synchronization failed");
      const payload = (await response.json()) as { data: SyncResult };
      setResult(payload.data);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="ingestion-sync-panel">
      <div>
        <strong>{t("sync.title")}</strong>
        <span>{t("sync.description")}</span>
      </div>
      <label>
        {t("sync.provider")}
        <select
          value={provider}
          onChange={(event) =>
            setProvider(event.target.value as SyncResult["provider"])
          }
        >
          <option value="SEOUL_OPEN_DATA">
            {t("provider.seoul_open_data")}
          </option>
          <option value="CULTURE_PORTAL">{t("provider.culture_portal")}</option>
        </select>
      </label>
      <label>
        {t("sync.fromDate")}
        <input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
      </label>
      <button
        className="button primary"
        disabled={pending || !from}
        onClick={() => void synchronize()}
        type="button"
      >
        <RefreshCw size={16} />
        {pending ? t("sync.running") : t("sync.run")}
      </button>
      {result ? (
        <p role="status">
          {t("sync.result", {
            fetched: result.fetched,
            selected: result.selected,
            inserted: result.inserted,
            unchanged: result.unchanged,
          })}
        </p>
      ) : null}
      {error ? (
        <p className="ingestion-sync-error" role="alert">
          {t("sync.error")}
        </p>
      ) : null}
    </section>
  );
}
