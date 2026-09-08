"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SavedFilter = { name: string; href: string };

export function SavedFilters({ storageKey, currentHref }: { storageKey: string; currentHref: string }) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [name, setName] = useState("");
  useEffect(() => {
    const load = () => {
      try { setFilters(JSON.parse(localStorage.getItem(storageKey) ?? "[]") as SavedFilter[]); } catch { setFilters([]); }
    };
    queueMicrotask(load);
  }, [storageKey]);
  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = [...filters.filter((filter) => filter.name !== trimmed), { name: trimmed, href: currentHref }].slice(-10);
    setFilters(next); localStorage.setItem(storageKey, JSON.stringify(next)); setName("");
  }
  function remove(filterName: string) {
    const next = filters.filter((filter) => filter.name !== filterName);
    setFilters(next); localStorage.setItem(storageKey, JSON.stringify(next));
  }
  return <section className="saved-filters" aria-label="저장된 필터"><div className="button-row"><input aria-label="필터 이름" maxLength={40} onChange={(event) => setName(event.target.value)} placeholder="필터 이름" value={name} /><button className="button ghost" onClick={save} type="button">현재 필터 저장</button></div>{filters.map((filter) => <span key={filter.name}><Link href={filter.href}>{filter.name}</Link><button aria-label={`${filter.name} 삭제`} onClick={() => remove(filter.name)} type="button">×</button></span>)}</section>;
}
