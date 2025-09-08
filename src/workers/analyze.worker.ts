// src/workers/analyze.worker.ts
import type { AnalysisRequest, AnalysisResponse, AnalysisResult, DetectionHit } from '../types';
import { analyzeUrls } from '../analyzers/urlDetector';
import { analyzeLanguageLures } from '../analyzers/languageDetector';
import { analyzeHtmlContent } from '../analyzers/htmlDetector';
import { analyzeSecrets } from '../analyzers/secretDetector';
import { calculateRiskScore, determineVerdict, generateReasons } from '../analyzers/scoreCalculator';
import { redactSensitiveData } from '../utils/redactor';
import { analyzeIdentityHeaders } from '../analyzers/identityDetector';

/** ---------- small helpers ---------- */

function clamp01(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
function sevTo0_100(sev: unknown): number {
  if (typeof sev === 'number') return Math.max(0, Math.min(100, sev));
  if (typeof sev === 'string') {
    const m: Record<string, number> = { low: 20, medium: 45, high: 75, critical: 90 };
    return m[sev.toLowerCase()] ?? 45;
  }
  return 45;
}

function extractHeader(field: string, text: string): string {
  const re = new RegExp(`^${field}\\s*:\\s*(.+)$`, 'im');
  const m = text.match(re);
  return m?.[1]?.trim() || '';
}

function parseFrom(text: string): { display?: string; email?: string; domain?: string } {
  const raw = extractHeader('From', text);
  if (!raw) return {};
  const m = raw.match(/^(.*?)(?:<([^>]+)>)?$/);
  const display = m?.[1]?.trim().replace(/^"|"$/g, '') || undefined;
  const email =
    (m?.[2] ||
      raw.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/)?.[1] ||
      '')?.toLowerCase() || undefined;
  const domain = email ? email.split('@')[1] : undefined;
  return { display, email, domain };
}

function getAllUrls(text: string): string[] {
  const out: string[] = [];
  const re = /(https?:\/\/[^\s)>"']+)/gi;
  let m;
  while ((m = re.exec(text))) {
    out.push(m[1].replace(/[)\],.;'"]+$/, ''));
  }
  return Array.from(new Set(out));
}

function extractDomainFromUrl(u: string): string {
  const m = u.match(/https?:\/\/([A-Za-z0-9.-]+\.[A-Za-z]{2,})/i);
  return (m?.[1] || '').toLowerCase();
}

function isDomainAllowed(host: string, allow: string[] = []): boolean {
  const h = host.toLowerCase();
  return allow.some(entry => {
    const e = entry.trim().toLowerCase();
    if (!e) return false;
    if (e.startsWith('.')) {
      return h === e.slice(1) || h.endsWith(e);
    }
    return h === e || h.endsWith('.' + e);
  });
}

function isSenderAllowed(email: string | undefined, allow: string[] = []): boolean {
  if (!email) return false;
  return allow.includes(email.toLowerCase());
}

/** ---------- worker message ---------- */

self.onmessage = async (ev: MessageEvent<AnalysisRequest & { policy?: { allowDomains?: string[]; allowSenders?: string[] } }>) => {
  try {
    const start = performance.now();

    // Allow for older types by casting to any
    const { input, policy } = (ev.data as any) || {};
    const allowDomains: string[] = policy?.allowDomains ?? [];
    const allowSenders: string[] = policy?.allowSenders ?? [];

    const allHits: DetectionHit[] = [];

    // Core analyzers (optionally policy-aware)
    allHits.push(...analyzeUrls(input.content, { allowDomains, allowSenders } as any));
    allHits.push(...analyzeLanguageLures(input.content));

    if (input.filename?.endsWith('.html') || input.filename?.endsWith('.eml')) {
      allHits.push(...analyzeHtmlContent(input.content, { allowDomains, allowSenders } as any));
    }

    allHits.push(...analyzeSecrets(input.content));

    // Identity headers (map to your DetectionHit shape)
    const idFindings = analyzeIdentityHeaders(input.content);
    for (const f of idFindings) {
      allHits.push({
        label: f.label,
        severity: sevTo0_100(f.severity),
        snippet: f.snippet || '',
      });
    }

    // Sender/display-name vs links mismatch (stay in DetectionHit shape)
    const from = parseFrom(input.content);
    const urls = getAllUrls(input.content);
    const linkDomains = Array.from(new Set(urls.map(extractDomainFromUrl).filter(Boolean)));

    if (from.domain && linkDomains.length > 0) {
      const suspiciousCross = linkDomains.some(
        d => d !== from.domain && !isDomainAllowed(d, allowDomains)
      );
      if (suspiciousCross) {
        allHits.push({
          label: `Sender domain (${from.domain}) differs from link domain(s): ${linkDomains.join(', ')}`,
          severity: 55,
          snippet: `From: ${from.display || ''} <${from.email || ''}>`,
        });
      }
    }

    if (from.display && from.domain) {
      const brand = from.display.trim().toLowerCase().replace(/["']/g, '');
      const brandWord = brand.split(/\s+/)[0] || '';
      if (brandWord && /^[a-z][a-z0-9-]{1,}$/.test(brandWord)) {
        const domainContainsBrand = from.domain.includes(brandWord);
        const allowedSender = isSenderAllowed(from.email, allowSenders);
        const allowedDomain = isDomainAllowed(from.domain, allowDomains);
        if (!domainContainsBrand && !allowedSender && !allowedDomain) {
          allHits.push({
            label: `Sender name "${from.display}" does not match sender domain "${from.domain}"`,
            severity: 80,
            snippet: `From: ${from.display} <${from.email || ''}>`,
          });
        }
      }
      if (from.email && from.display.toLowerCase() === from.email.toLowerCase()) {
        allHits.push({
          label: 'Display name equals email (spoof indicator)',
          severity: 30,
          snippet: `From: ${from.display}`,
        });
      }
    }

    // Score & verdict
    const riskScore = calculateRiskScore(allHits);
    const verdict = determineVerdict(riskScore);
    const reasons = generateReasons(allHits);

    const result: AnalysisResult = {
      verdict,
      riskScore,
      reasons: reasons.length ? reasons : ['No specific issues detected'],
      sanitizedPreview: redactSensitiveData(String(input.content).slice(0, 1000)),
      originalSize: input.size,
      analysisTime: Math.round(performance.now() - start),
      detectionHits: allHits,
    };

    const response: AnalysisResponse = { success: true, result };
    // (no need to mutate allHits; GC will handle after postMessage)
    self.postMessage(response);
  } catch (err) {
    const response: AnalysisResponse = {
      success: false,
      error: err instanceof Error ? err.message : 'Analysis failed',
    };
    self.postMessage(response);
  }
};
