import { DetectionHit } from '../types';

const SUSPICIOUS_TLDS = [
  '.tk', '.ml', '.ga', '.cf', '.top', '.click', '.download', '.zip', '.work'
];

const SUSPICIOUS_KEYWORDS = [
  'verify', 'confirm', 'suspend', 'urgent', 'immediate', 'expire',
  'secure', 'update', 'validate', 'click-here', 'limited-time'
];

export function analyzeUrls(content: string): DetectionHit[] {
  const hits: DetectionHit[] = [];
  
  // Extract URLs
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const urls = content.match(urlRegex) || [];
  
  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      
      // Check for IP addresses instead of domains
      if (/^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname)) {
        hits.push({
          label: 'IP Address URL',
          severity: 60,
          snippet: urlObj.hostname
        });
      }
      
      // Check for suspicious TLDs
      const domain = urlObj.hostname.toLowerCase();
      for (const tld of SUSPICIOUS_TLDS) {
        if (domain.endsWith(tld)) {
          hits.push({
            label: 'Suspicious TLD',
            severity: 40,
            snippet: domain + tld
          });
          break;
        }
      }
      
      // Check for punycode/IDN homoglyphs
      if (domain.includes('xn--')) {
        hits.push({
          label: 'Punycode Domain',
          severity: 50,
          snippet: domain
        });
      }
      
      // Check for suspicious path keywords
      const pathAndQuery = (urlObj.pathname + urlObj.search).toLowerCase();
      for (const keyword of SUSPICIOUS_KEYWORDS) {
        if (pathAndQuery.includes(keyword)) {
          hits.push({
            label: 'Suspicious URL Pattern',
            severity: 35,
            snippet: keyword
          });
        }
      }
      
      // Check for high-entropy paths
      if (urlObj.pathname.length > 20) {
        const pathEntropy = calculatePathEntropy(urlObj.pathname);
        if (pathEntropy > 4.5) {
          hits.push({
            label: 'High-Entropy Path',
            severity: 30,
            snippet: urlObj.pathname.substring(0, 50)
          });
        }
      }
      
    } catch (error) {
      // Invalid URL format
      hits.push({
        label: 'Malformed URL',
        severity: 25,
        snippet: url.substring(0, 50)
      });
    }
  }
  
  return hits;
}

function calculatePathEntropy(path: string): number {
  const chars = path.split('');
  const frequency: Record<string, number> = {};
  
  for (const char of chars) {
    frequency[char] = (frequency[char] || 0) + 1;
  }
  
  const length = chars.length;
  let entropy = 0;
  
  for (const count of Object.values(frequency)) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}