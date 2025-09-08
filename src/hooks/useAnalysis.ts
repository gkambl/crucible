// src/hooks/useAnalysis.ts
import { useState, useCallback, useRef } from 'react';
import { AnalysisResult, RecentItem, AnalysisRequest, AnalysisResponse } from '../types';
import { analyzePhishyUrls } from '../analyzers/urlPhish';
import defaultAllowlist from '../policy/defaultAllowlist.json'; // <-- you created this in step 5B

// ---- Types for policy (kept lightweight) ----
type Policy = {
  allowDomains?: string[];  // e.g. [".gov.uk", "ledger.com", ".barclays.co.uk"]
  allowSenders?: string[];  // exact email matches (lowercased)
};

// --- helpers: verdict escalation ---
function escalateVerdict(a: 'ALLOW' | 'WARN' | 'BLOCK', b: 'ALLOW' | 'WARN' | 'BLOCK') {
  const rank = { ALLOW: 0, WARN: 1, BLOCK: 2 } as const;
  const rev = ['ALLOW', 'WARN', 'BLOCK'] as const;
  return rev[Math.max(rank[a], rank[b])];
}

// 1B: numeric safety helpers (guard against NaN/Infinity)
const safeNum = (n: unknown, fallback = 0) =>
  Number.isFinite(Number(n)) ? Number(n) : fallback;

const clampRisk = (n: unknown) =>
  Math.max(0, Math.min(100, safeNum(n, 0)));

// very light “sanitizer” for preview pane
function sanitizePreview(s: string, max = 1200) {
  const trimmed = s.slice(0, max);
  // Neutralize links visually; the UI should already render as plain text
  return trimmed.replace(/https?:\/\/[^\s)>"']+/gi, (m) => `[link: ${m}]`);
}

function mapUrlFindingsToHits(urls: { url: string; reasons: string[] }[]) {
  return urls.map((u) => ({
    type: 'url',
    value: u.url,
    reasons: u.reasons,
  }));
}

function getMimeType(filename: string): string {
  const extension = filename?.toLowerCase().split('.').pop();
  const table: Record<string, string> = {
    txt: 'text/plain',
    log: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    json: 'application/json',
    jsonl: 'application/jsonl',
    html: 'text/html',
    eml: 'message/rfc822',
    pdf: 'application/pdf',
  };
  return table[extension || ''] || 'text/plain';
}

function announceToScreenReader(message: string) {
  const el = document.createElement('div');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.className = 'sr-only';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => document.body.removeChild(el), 1000);
}

// --- Load + merge policy: default + local override ---
function loadMergedPolicy(): Policy {
  let merged: Policy = {
    allowDomains: Array.isArray((defaultAllowlist as any)?.allowDomains)
      ? (defaultAllowlist as any).allowDomains.slice()
      : [],
    allowSenders: Array.isArray((defaultAllowlist as any)?.allowSenders)
      ? (defaultAllowlist as any).allowSenders.slice()
      : [],
  };

  try {
    const raw = localStorage.getItem('crucible_policy_v1');
    if (raw) {
      const user = JSON.parse(raw) as Policy;
      if (Array.isArray(user.allowDomains)) {
        merged.allowDomains = Array.from(
          new Set([...(merged.allowDomains || []), ...user.allowDomains.map(s => s.trim())]),
        );
      }
      if (Array.isArray(user.allowSenders)) {
        merged.allowSenders = Array.from(
          new Set([...(merged.allowSenders || []), ...user.allowSenders.map(s => s.trim().toLowerCase())]),
        );
      }
    }
  } catch {
    // ignore corrupt localStorage; keep defaults
  }

  return merged;
}

export function useAnalysis() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const workerRef = useRef<Worker | null>(null);

  const analyze = useCallback(async (content: string, filename?: string, size?: number) => {
    const started = performance.now();
    setIsAnalyzing(true);
    setResult(null);

    try {
      // Load policy for this analysis run (cheap + allows hot changes via localStorage)
      const policy = loadMergedPolicy();

      // 1) Run fast, local URL-phish heuristics immediately (now policy-aware)
      const urlReport = analyzePhishyUrls(content || '', policy);
      const baseReasons = [
        ...urlReport.indicators,
        ...urlReport.urls.flatMap((u) => u.reasons.map((r) => `${r} (${u.url})`)),
      ];
      const baseHits = mapUrlFindingsToHits(urlReport.urls);

      // Provide an immediate local-first result (1B: clamp numbers)
      const preliminary: AnalysisResult = {
        verdict: urlReport.verdict,                              // ALLOW/WARN/BLOCK
        riskScore: clampRisk(urlReport.riskScore),               // 0..100, safe
        reasons: baseReasons.length ? baseReasons : ['No specific issues detected'],
        sanitizedPreview: sanitizePreview(content || ''),
        originalSize: safeNum(size ?? (content ? new Blob([content]).size : 0), 0),
        analysisTime: Math.max(1, safeNum(Math.round(performance.now() - started), 1)),
        detectionHits: baseHits,
      };
      setResult(preliminary);

      // 2) Worker (full heuristics + sender/link-domain checks), pass policy through
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL('../workers/analyze.worker.ts', import.meta.url),
          { type: 'module' }
        );
      }
      const worker = workerRef.current;

      const workerPromise = new Promise<AnalysisResult>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Analysis timeout')), 10000);

        worker.onmessage = (e: MessageEvent<AnalysisResponse>) => {
          clearTimeout(timeout);
          if (e.data.success && e.data.result) resolve(e.data.result);
          else reject(new Error(e.data.error || 'Analysis failed'));
        };

        worker.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      const request: AnalysisRequest = {
        input: {
          content,
          filename,
          mimeType: filename ? getMimeType(filename) : undefined,
          size: safeNum(size ?? (content ? new Blob([content]).size : 0), 0),
        },
        // @ts-ignore – if your AnalysisRequest type doesn’t yet include policy, add it there too
        policy, // <-- pass allowlist to worker
      };

      worker.postMessage(request);

      // Merge results (1B: clamp & guard)
      const workerResult = await workerPromise;

      const merged: AnalysisResult = {
        verdict: escalateVerdict(preliminary.verdict, workerResult.verdict),
        riskScore: Math.max(
          clampRisk(preliminary.riskScore),
          clampRisk(workerResult.riskScore),
        ),
        reasons: Array.from(new Set([
          ...preliminary.reasons,
          ...(workerResult.reasons || []),
        ])),
        sanitizedPreview: preliminary.sanitizedPreview,
        originalSize: safeNum(preliminary.originalSize, 0),
        analysisTime: Math.max(
          safeNum(preliminary.analysisTime, 1),
          safeNum(workerResult.analysisTime || 0, 0),
        ),
        detectionHits: [
          ...preliminary.detectionHits,
          ...(workerResult.detectionHits || []),
        ],
      };

      setResult(merged);

      // Recent items use the final (merged if available) result
      const final = merged;
      const recentItem: RecentItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        timestamp: Date.now(),
        verdict: final.verdict,
        firstReason: final.reasons[0] || 'No specific issues detected',
        filename,
      };
      setRecentItems((prev) => [recentItem, ...prev.slice(0, 4)]);

      announceToScreenReader(
        `Analysis complete. Verdict: ${final.verdict}. Risk score: ${final.riskScore} out of 100.`
      );
    } catch (err) {
      console.error('Analysis error:', err);
      const errorResult: AnalysisResult = {
        verdict: 'WARN',
        riskScore: 55,
        reasons: ['Analysis failed — local heuristics unavailable or worker error'],
        sanitizedPreview: 'Error during analysis',
        originalSize: 0,
        analysisTime: 0,
        detectionHits: [],
      };
      setResult(errorResult);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearRecent = useCallback(() => setRecentItems([]), []);
  const clearAll = useCallback(() => {
    setResult(null);
    setRecentItems([]);
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return { result, isAnalyzing, recentItems, analyze, clearRecent, clearAll };
}
