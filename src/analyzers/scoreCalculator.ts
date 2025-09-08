// src/analyzers/scoreCalculator.ts
import type { DetectionHit } from '../types';

/**
 * Clamp a number into [0, 100]
 */
function clamp0_100(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

/**
 * Normalize a DetectionHit's severity into [0,100]
 */
function normSeverity(hit: DetectionHit): number {
  // If analyzers accidentally pass strings like "high"/"medium", map them.
  const sev = (hit as any).severity;
  if (typeof sev === 'string') {
    const map: Record<string, number> = { low: 20, medium: 45, high: 75, critical: 90 };
    return clamp0_100(map[sev.toLowerCase()] ?? 0);
  }
  return clamp0_100(sev);
}

/**
 * Calculate an overall risk score from a list of hits using
 * diminishing returns (top-heavy weighting) and clamped to [0,100].
 */
export function calculateRiskScore(hits: DetectionHit[]): number {
  if (!hits || hits.length === 0) return 0;

  // Sort hits by severity desc
  const severities = hits.map(normSeverity).sort((a, b) => b - a);

  // Diminishing weights for top signals
  const weights = [1.0, 0.7, 0.5, 0.35, 0.25, 0.2, 0.15, 0.1];

  let score = 0;
  for (let i = 0; i < severities.length; i++) {
    const w = i < weights.length ? weights[i] : 0.05; // tiny tail weight
    score += severities[i] * w;
  }

  // Soft cap + clamp
  return clamp0_100(score);
}

/**
 * Map a risk score to a verdict.
 */
export function determineVerdict(riskScore: number): 'BLOCK' | 'WARN' | 'ALLOW' {
  const s = clamp0_100(riskScore);
  if (s >= 80) return 'BLOCK';
  if (s >= 50) return 'WARN';
  return 'ALLOW';
}

/**
 * Produce human-readable reasons from hits (deduped, most severe first).
 */
export function generateReasons(hits: DetectionHit[], maxReasons = 10): string[] {
  if (!hits || hits.length === 0) return [];

  // Sort by severity desc, then label asc for stable order
  const sorted = [...hits].sort((a, b) => {
    const da = normSeverity(b) - normSeverity(a);
    if (da !== 0) return da;
    return (a.label || '').localeCompare(b.label || '');
  });

  const seen = new Set<string>();
  const reasons: string[] = [];

  for (const h of sorted) {
    const label = h.label?.trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    reasons.push(label);
    if (reasons.length >= maxReasons) break;
  }

  return reasons;
}
