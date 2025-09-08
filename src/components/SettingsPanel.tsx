// src/components/SettingsPanel.tsx
import React, { useRef, useState } from "react";
import { X, Plus, Upload, Download, RotateCcw } from "lucide-react";
import { useAllowlist } from "../hooks/useAllowlist";

type Props = { open: boolean; onClose: () => void };

export function SettingsPanel({ open, onClose }: Props) {
  const {
    allowlist, addDomain, removeDomain, addSender, removeSender,
    resetToDefault, exportJson, importJson
  } = useAllowlist();

  const [domainInput, setDomainInput] = useState("");
  const [senderInput, setSenderInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-3xl bg-[#141a2a] border border-[#9bb0ff]/10 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-[#d9e2ff]">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9bb0ff]/70 hover:text-[#d9e2ff] hover:bg-white/5"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#9bb0ff] mb-6">
          <strong>Allowlist</strong> is local to your browser. We never fetch or auto-update it from the internet.
        </p>

        {/* Domains */}
        <section className="mb-8">
          <h3 className="text-lg font-medium text-[#d9e2ff] mb-2">Allowed Domains</h3>
          <div className="flex gap-2 mb-3">
            <input
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder='e.g. "ledger.com" or ".gov.uk"'
              className="flex-1 bg-[#0b1020] border border-[#9bb0ff]/20 rounded-lg px-3 py-2 text-[#d9e2ff] placeholder-[#9bb0ff]/40"
            />
            <button
              onClick={() => { if (domainInput.trim()) { addDomain(domainInput); setDomainInput(""); } }}
              className="px-3 py-2 rounded-lg bg-[#0339b8] text-white hover:opacity-90 inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {allowlist.domains.map((d) => (
              <span key={d} className="inline-flex items-center gap-2 px-2 py-1 text-sm rounded-lg bg-white/5 border border-[#9bb0ff]/15 text-[#c9d3ff]">
                {d}
                <button
                  className="text-[#9bb0ff]/60 hover:text-[#ef4444]"
                  onClick={() => removeDomain(d)}
                  aria-label={`Remove ${d}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </section>

        {/* Senders */}
        <section className="mb-8">
          <h3 className="text-lg font-medium text-[#d9e2ff] mb-2">Allowed Sender Emails</h3>
          <div className="flex gap-2 mb-3">
            <input
              value={senderInput}
              onChange={(e) => setSenderInput(e.target.value)}
              placeholder='e.g. "support@ledger.com"'
              className="flex-1 bg-[#0b1020] border border-[#9bb0ff]/20 rounded-lg px-3 py-2 text-[#d9e2ff] placeholder-[#9bb0ff]/40"
            />
            <button
              onClick={() => { if (senderInput.trim()) { addSender(senderInput); setSenderInput(""); } }}
              className="px-3 py-2 rounded-lg bg-[#0339b8] text-white hover:opacity-90 inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {allowlist.senders.map((s) => (
              <span key={s} className="inline-flex items-center gap-2 px-2 py-1 text-sm rounded-lg bg-white/5 border border-[#9bb0ff]/15 text-[#c9d3ff]">
                {s}
                <button
                  className="text-[#9bb0ff]/60 hover:text-[#ef4444]"
                  onClick={() => removeSender(s)}
                  aria-label={`Remove ${s}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </section>

        {/* Import / Export / Reset */}
        <div className="flex flex-wrap gap-3 justify-between border-t border-[#9bb0ff]/10 pt-4">
          <div className="flex gap-2">
            <button
              onClick={exportJson}
              className="px-3 py-2 rounded-lg bg-white/5 text-[#d9e2ff] border border-[#9bb0ff]/20 hover:bg-white/10 inline-flex items-center gap-2"
              title="Export allowlist to a JSON file"
            >
              <Download className="w-4 h-4" /> Export JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try { await importJson(f); }
                catch (err) { alert(`Import failed: ${(err as Error).message}`); }
                finally { e.currentTarget.value = ""; }
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="px-3 py-2 rounded-lg bg-white/5 text-[#d9e2ff] border border-[#9bb0ff]/20 hover:bg-white/10 inline-flex items-center gap-2"
              title="Import from a local JSON file"
            >
              <Upload className="w-4 h-4" /> Import JSON
            </button>
          </div>

          <button
            onClick={() => {
              if (confirm("Reset allowlist to the built-in defaults?")) {
                resetToDefault();
              }
            }}
            className="px-3 py-2 rounded-lg bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/20 inline-flex items-center gap-2"
            title="Restore the bundled default list"
          >
            <RotateCcw className="w-4 h-4" /> Reset to default
          </button>
        </div>
      </div>
    </div>
  );
}
