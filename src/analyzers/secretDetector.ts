import { DetectionHit } from '../types';
import { calculateEntropy } from '../utils/redactor';

const SECRET_PATTERNS = [
  { pattern: /sk_[a-zA-Z0-9]{24,}/g, label: 'Stripe Secret Key', severity: 90 },
  { pattern: /pk_[a-zA-Z0-9]{24,}/g, label: 'Stripe Public Key', severity: 30 },
  { pattern: /AIza[0-9A-Za-z_-]{35}/g, label: 'Google API Key', severity: 80 },
  { pattern: /AKIA[0-9A-Z]{16}/g, label: 'AWS Access Key', severity: 85 },
  { pattern: /github_pat_[a-zA-Z0-9_]{82}/g, label: 'GitHub PAT', severity: 85 },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, label: 'GitHub Token', severity: 85 },
  { pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/g, label: 'Slack Token', severity: 80 },
];

const JWT_REGEX = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;

export function analyzeSecrets(content: string): DetectionHit[] {
  const hits: DetectionHit[] = [];
  
  // Check for known secret patterns
  for (const { pattern, label, severity } of SECRET_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        hits.push({
          label,
          severity,
          snippet: `${match.substring(0, 8)}...${match.substring(match.length - 4)}`
        });
      }
    }
  }
  
  // Check for JWT tokens
  const jwtMatches = content.match(JWT_REGEX);
  if (jwtMatches) {
    for (const jwt of jwtMatches) {
      hits.push({
        label: 'JWT Token',
        severity: 70,
        snippet: `${jwt.substring(0, 20)}...`
      });
    }
  }
  
  // Check for high-entropy strings that might be secrets
  const words = content.split(/\s+/);
  for (const word of words) {
    if (word.length >= 32 && word.length <= 128) {
      const entropy = calculateEntropy(word);
      if (entropy > 4.8) {
        // Check if it's likely Base64 or hex
        const isBase64Like = /^[A-Za-z0-9+/]+=*$/.test(word);
        const isHexLike = /^[0-9a-fA-F]+$/.test(word);
        
        if (isBase64Like || isHexLike) {
          hits.push({
            label: 'High-Entropy Token',
            severity: 55,
            snippet: `${word.substring(0, 12)}...`
          });
        }
      }
    }
  }
  
  return hits;
}