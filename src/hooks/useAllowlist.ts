// src/hooks/useAllowlist.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_ALLOWLIST, type Allowlist } from "../config/allowlist";

const LS_KEY = "crucible.allowlist.v1";

function normalizeDomain(input: string): string {
  const s = input.trim().toLowerCase();
  if (!s) return "";
  // allow suffix style (".gov.uk") or FQDN ("ledger.com")
  return s.startsWith(".") ? s : s.replace(/^https?:\/\//, "").split("/")[0];
}

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function useAllowlist() {
  const [allowlist, setAllowlist] = useState<Allowlist>(DEFAULT_ALLOWLIST);
  const [dirty, setDirty] = useState(false);

  // Load from localStorage (if present), else default
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // basic shape check
        if (parsed && Array.isArray(parsed.domains) && Array.isArray(parsed.senders)) {
          setAllowlist({
            domains: parsed.domains.map(normalizeDomain).filter(Boolean),
            senders: parsed.senders.map(normalizeEmail).filter(Boolean),
          });
        }
      }
    } catch {}
  }, []);

  // Persist when changed
  useEffect(() => {
    if (!dirty) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(allowlist));
    } catch {}
  }, [allowlist, dirty]);

  const addDomain = useCallback((d: string) => {
    const nd = normalizeDomain(d);
    if (!nd) return;
    setAllowlist(prev => {
      if (prev.domains.includes(nd)) return prev;
      return { ...prev, domains: [...prev.domains, nd] };
    });
    setDirty(true);
  }, []);

  const removeDomain = useCallback((d: string) => {
    const nd = normalizeDomain(d);
    setAllowlist(prev => ({ ...prev, domains: prev.domains.filter(x => x !== nd) }));
    setDirty(true);
  }, []);

  const addSender = useCallback((e: string) => {
    const ne = normalizeEmail(e);
    if (!ne) return;
    setAllowlist(prev => {
      if (prev.senders.includes(ne)) return prev;
      return { ...prev, senders: [...prev.senders, ne] };
    });
    setDirty(true);
  }, []);

  const removeSender = useCallback((e: string) => {
    const ne = normalizeEmail(e);
    setAllowlist(prev => ({ ...prev, senders: prev.senders.filter(x => x !== ne) }));
    setDirty(true);
  }, []);

  const resetToDefault = useCallback(() => {
    setAllowlist(DEFAULT_ALLOWLIST);
    setDirty(true);
  }, []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(allowlist, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crucible-allowlist.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [allowlist]);

  const importJson = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.domains) || !Array.isArray(parsed.senders)) {
      throw new Error("Invalid allowlist file");
    }
    setAllowlist({
      domains: parsed.domains.map(normalizeDomain).filter(Boolean),
      senders: parsed.senders.map(normalizeEmail).filter(Boolean),
    });
    setDirty(true);
  }, []);

  return {
    allowlist,
    addDomain,
    removeDomain,
    addSender,
    removeSender,
    resetToDefault,
    exportJson,
    importJson,
  };
}
