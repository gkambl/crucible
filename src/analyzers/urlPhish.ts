// src/analyzers/urlPhish.ts
// Lightweight, local-only phishing heuristics with allowlist + sender/name checks.

export type UrlFinding = {
  url: string;
  reasons: string[];
  scoreBump: number; // 0..40
};

export type PhishAnalysis = {
  riskScore: number;        // 0..100
  riskLevel: "low" | "medium" | "high";
  verdict: "ALLOW" | "WARN" | "BLOCK";
  indicators: string[];     // human-readable reasons
  urls: UrlFinding[];
};

export type Policy = {
  allowDomains?: string[]; // suffix or fqdn
  allowSenders?: string[]; // exact email addresses
};

const wpResetRegex = /\/wp-login\.php(?:\?|#|$)/i;
const wpResetParams = /(action=(rp|resetpass|lostpassword)|\bkey=[A-Za-z0-9]{16,})/i;
const loginWords = /\b(login|signin|reset|password|set password|verify)\b/i;
const cryptoBait = /\b(BTC|Bitcoin|ETH|Ethereum|USDT|Tether|DOGE|Dogecoin)\b/i;
const moneyBait = /\b(?:USD|EUR|GBP|AUD|CAD)\b[^0-9]*([0-9][0-9\.,]{4,})/i; // 5+ digits
const mixedLangHint = /[\u3040-\u30ff\u4e00-\u9faf]/; // CJK
const suspiciousBlogspotRef = /\bblogspot\.[a-z.]+/i;
const setPasswordPhrases = /\b(set|reset)\s+(your\s+)?password\b/i;

function extractHeader(field: string, text: string): string {
  const re = new RegExp(`^${field}\\s*:\\s*(.+)$`, "im");
  const m = text.match(re);
  return m?.[1]?.trim() || "";
}

function parseFrom(text: string): { display?: string; email?: string; domain?: string } {
  const raw = extractHeader("From", text);
  if (!raw) return {};
  // Try parse "Name <email@domain>"
  const m = raw.match(/^(.*?)(?:<([^>]+)>)?$/);
  const display = m?.[1]?.trim().replace(/^"|"$/g, "") || undefined;
  const email = (m?.[2] || raw.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/)?.[1] || "").toLowerCase() || undefined;
  const domain = email ? email.split("@")[1] : undefined;
  return { display, email, domain };
}

function extractDomain(s: string): string {
  const emailMatch = s.match(/@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/);
  if (emailMatch) return emailMatch[1].toLowerCase();
  const urlMatch = s.match(/https?:\/\/([A-Za-z0-9.-]+\.[A-Za-z]{2,})/i);
  if (urlMatch) return urlMatch[1].toLowerCase();
  return "";
}

function getAllUrls(text: string): string[] {
  const u: string[] = [];
  const re = /(https?:\/\/[^\s)>"']+)/gi;
  let m;
  while ((m = re.exec(text))) {
    u.push(m[1].replace(/[)\],.;'"]+$/, ""));
  }
  return Array.from(new Set(u));
}

function isDomainAllowed(host: string, allow: string[] = []): boolean {
  const h = host.toLowerCase();
  return allow.some(entry => {
    const e = entry.toLowerCase();
    if (!e) return false;
    if (e.startsWith(".")) {
      // suffix allow, e.g. ".gov.uk"
      return h === e.slice(1) || h.endsWith(e);
    }
    return h === e || h.endsWith("." + e);
  });
}

function isSenderAllowed(email: string | undefined, allow: string[] = []): boolean {
  if (!email) return false;
  return allow.includes(email.toLowerCase());
}

function scoreUrl(url: string, fullText: string): UrlFinding {
  const reasons: string[] = [];
  let bump = 0;

  if (wpResetRegex.test(url)) {
    reasons.push("WordPress login/reset path");
    bump += 20;
    if (wpResetParams.test(url)) {
      reasons.push("Contains reset params (action=rp/key=...)");
      bump += 10;
    }
  }

  if (loginWords.test(fullText) || setPasswordPhrases.test(fullText)) {
    reasons.push("Mentions credential/reset flows");
    bump += 5;
  }

  return { url, reasons, scoreBump: Math.min(40, bump) };
}

export function analyzePhishyUrls(input: string, policy?: Policy): PhishAnalysis {
  const text = input || "";
  const urls = getAllUrls(text).map(u => scoreUrl(u, text));
  const indicators: string[] = [];

  const from = parseFrom(text);
  const subject = extractHeader("Subject", text);
  const linkDomains = Array.from(new Set(urls.map(f => extractDomain(f.url)).filter(Boolean)));

  let score = 0;

  // ---------- Allowlist relaxations ----------
  const allowD = policy?.allowDomains ?? [];
  const allowS = policy?.allowSenders ?? [];

  const allLinksAllowed = linkDomains.length > 0 && linkDomains.every(d => isDomainAllowed(d, allowD));
  const senderAllowed   = isSenderAllowed(from.email, allowS) || (from.domain ? isDomainAllowed(from.domain, allowD) : false);

  if (allLinksAllowed) {
    indicators.push("All link domains are allowlisted");
    score -= 15; // reduce false positives
  }
  if (senderAllowed) {
    indicators.push("Sender is allowlisted");
    score -= 10;
  }

  // ---------- Core URL heuristics ----------
  if (urls.some(f => f.reasons.some(r => r.includes("WordPress")))) {
    indicators.push("WordPress reset/login link detected");
  }

  if (cryptoBait.test(text) || cryptoBait.test(subject)) {
    indicators.push("Crypto terms present");
    score += 15;
  }
  if (moneyBait.test(text) || moneyBait.test(subject)) {
    indicators.push("Large currency amount mentioned");
    score += 10;
  }

  if (suspiciousBlogspotRef.test(text)) {
    indicators.push("Unrelated blogspot identity referenced");
    score += 10;
  }

  const hasMixedLang = mixedLangHint.test(subject) || mixedLangHint.test(text);
  const mentionsReset = setPasswordPhrases.test(text) || loginWords.test(text);
  if (hasMixedLang && mentionsReset) {
    indicators.push("Mixed language plus account-reset flow");
    score += 10;
  }

  if (linkDomains.length >= 1 && urls.length >= 2) {
    indicators.push("Multiple login/reset links");
    score += 5;
  }

  // ---------- Sender vs links mismatch ----------
  if (from.domain && linkDomains.length > 0) {
    const cross = linkDomains.some(d => d !== from.domain && !isDomainAllowed(d, allowD));
    if (cross) {
      indicators.push(`Sender domain (${from.domain}) differs from link domain(s): ${linkDomains.join(", ")}`);
      score += 12;
    }
  }

  // ---------- Sender display-name vs address mismatch ----------
  // If display name looks like a brand (letters only, e.g., "Ledger") but email domain not related
  if (from.display && from.domain) {
    const brand = from.display.trim().toLowerCase().replace(/["']/g, "");
    const brandWord = brand.split(/\s+/)[0] || ""; // take first word
    if (brandWord && /^[a-z][a-z0-9-]{1,}$/.test(brandWord)) {
      // brand mismatch if domain doesn't contain brand word AND not allowlisted
      const domainContainsBrand = from.domain.includes(brandWord);
      if (!domainContainsBrand && !isDomainAllowed(from.domain, allowD) && !isSenderAllowed(from.email, allowS)) {
        indicators.push(`Sender name "${from.display}" does not match sender domain "${from.domain}"`);
        score += 15;
      }
    }
    // display equals raw email (low-quality spoof)
    if (from.display.toLowerCase() === (from.email || "").toLowerCase()) {
      indicators.push("Display name equals email (spoof indicator)");
      score += 6;
    }
  }

  // Aggregate URL bumps
  const urlBump = urls.reduce((acc, f) => acc + f.scoreBump, 0);
  score += Math.min(40, urlBump);

  // Clamp & map
  const riskScore = Math.max(0, Math.min(100, score));
  const riskLevel = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";
  const verdict: PhishAnalysis["verdict"] =
    riskScore >= 80 ? "BLOCK" : riskScore >= 60 ? "WARN" : "ALLOW";

  return { riskScore, riskLevel, verdict, indicators, urls };
}
