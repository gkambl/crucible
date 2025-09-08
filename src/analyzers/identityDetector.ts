import allowlist from "../policy/defaultAllowlist.json";

export type IdHit = { label: string; severity: number; snippet: string };

function extractHeader(field: string, text: string): string {
  const re = new RegExp(`^${field}\\s*:\\s*(.+)$`, "im");
  const m = text.match(re);
  return m?.[1]?.trim() || "";
}
function hostFrom(s: string): string {
  try { if (/^https?:\/\//i.test(s)) return new URL(s).hostname.toLowerCase(); } catch {}
  const emailMatch = s.match(/@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/);
  return emailMatch ? emailMatch[1].toLowerCase() : "";
}
function brandFromDisplayName(s: string): string {
  return (s || "").split(/[<\(]/)[0].trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function brandFromDomain(d: string): string {
  const core = d.replace(/^www\./, "");
  const parts = core.split(".");
  const base = parts.length >= 2 ? parts[parts.length-2] : core;
  return base.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function isAllowlistedHost(host: string): boolean {
  if (!host) return false;
  const exact = new Set((allowlist as any)?.exact || []);
  if (exact.has(host)) return true;
  const patterns: string[] = (allowlist as any)?.hosts || [];
  return patterns.some(p => {
    if (p.startsWith("*.")) {
      const suf = p.slice(1).toLowerCase();
      return host.endsWith(suf) || host === p.slice(2);
    }
    return host === p.toLowerCase();
  });
}
function damerauLevenshtein(a: string, b: string): number {
  // Tiny distance to catch lookalikes (e.g., ledgerr vs ledger)
  const m: number[][] = [];
  const al = a.length, bl = b.length;
  for (let i=0;i<=al;i++){ m[i]=[i]; }
  for (let j=0;j<=bl;j++){ m[0][j]=j; }
  for (let i=1;i<=al;i++){
    for (let j=1;j<=bl;j++){
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      m[i][j] = Math.min(
        m[i-1][j] + 1,
        m[i][j-1] + 1,
        m[i-1][j-1] + cost
      );
      if (i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) {
        m[i][j] = Math.min(m[i][j], m[i-2][j-2] + cost);
      }
    }
  }
  return m[al][bl];
}

export function analyzeIdentityHeaders(text: string): IdHit[] {
  const hits: IdHit[] = [];
  const from = extractHeader("From", text);
  const replyTo = extractHeader("Reply-To", text);

  const fromDomain = hostFrom(from);
  const replyDomain = hostFrom(replyTo);

  // Display-name vs domain brand
  const displayName = (from.match(/^([^<]+)</)?.[1] || from).trim();
  const brandName = brandFromDisplayName(displayName);
  const brandDomain = brandFromDomain(fromDomain);

  if (brandName && brandDomain) {
    const dist = damerauLevenshtein(brandName, brandDomain);
    const isClose = dist <= 1 && Math.min(brandName.length, brandDomain.length) >= 5;
    if (!isClose && brandName && brandDomain && !isAllowlistedHost(fromDomain)) {
      hits.push({
        label: `Sender display name "${displayName}" does not match sender domain "${fromDomain}"`,
        severity: 25, // strong
        snippet: from
      });
    }
  }

  // Reply-To domain mismatch (classic phish)
  if (replyDomain && fromDomain && replyDomain !== fromDomain && !isAllowlistedHost(replyDomain)) {
    hits.push({
      label: `Reply-To domain "${replyDomain}" differs from From domain "${fromDomain}"`,
      severity: 20,
      snippet: `Reply-To: ${replyTo}`
    });
  }

  // Extra nudge for famous brands spoofed by unrelated domains
  const famous = ["ledger","coinbase","binance","kraken","revolut","wise","paypal","apple","google","microsoft","amazon"];
  if (famous.includes(brandName) && brandDomain && brandName !== brandDomain) {
    hits.push({
      label: `Famous brand "${displayName}" sent from unrelated domain "${fromDomain}"`,
      severity: 20,
      snippet: from
    });
  }

  return hits;
}
