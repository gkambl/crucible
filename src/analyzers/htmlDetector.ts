import { DetectionHit } from '../types';

export function analyzeHtmlContent(content: string): DetectionHit[] {
  const hits: DetectionHit[] = [];
  
  // Check for hidden form fields
  const hiddenFieldRegex = /<input[^>]*type\s*=\s*["']hidden["'][^>]*>/gi;
  const hiddenFields = content.match(hiddenFieldRegex);
  if (hiddenFields && hiddenFields.length > 0) {
    hits.push({
      label: 'Hidden Form Fields',
      severity: 30,
      snippet: `${hiddenFields.length} hidden inputs found`
    });
  }
  
  // Check for off-screen positioning
  const offScreenPatterns = [
    /position\s*:\s*absolute[^;]*left\s*:\s*-\d+/gi,
    /margin-left\s*:\s*-\d+/gi,
    /text-indent\s*:\s*-\d+/gi,
    /visibility\s*:\s*hidden/gi,
    /display\s*:\s*none/gi
  ];
  
  for (const pattern of offScreenPatterns) {
    if (pattern.test(content)) {
      hits.push({
        label: 'Off-Screen Elements',
        severity: 40,
        snippet: 'Hidden positioning detected'
      });
      break;
    }
  }
  
  // Check for data URIs
  const dataUriRegex = /data:[^;]+;base64,[A-Za-z0-9+/=]+/g;
  const dataUris = content.match(dataUriRegex);
  if (dataUris && dataUris.length > 0) {
    hits.push({
      label: 'Data URI Scheme',
      severity: 35,
      snippet: `${dataUris.length} data URIs found`
    });
  }
  
  // Check for form action to external domains
  const formActionRegex = /<form[^>]*action\s*=\s*["']([^"']*?)["'][^>]*>/gi;
  let match;
  while ((match = formActionRegex.exec(content)) !== null) {
    const action = match[1];
    if (action.startsWith('http') && !action.includes(window.location.hostname)) {
      hits.push({
        label: 'External Form Submission',
        severity: 70,
        snippet: action
      });
    }
  }
  
  // Check for obfuscation indicators
  const obfuscationPatterns = [
    /eval\s*\(/gi,
    /fromCharCode/gi,
    /unescape/gi,
    /&#x[0-9a-f]+;/gi,
    /\\u[0-9a-f]{4}/gi
  ];
  
  for (const pattern of obfuscationPatterns) {
    if (pattern.test(content)) {
      hits.push({
        label: 'Code Obfuscation',
        severity: 65,
        snippet: 'Obfuscated content detected'
      });
      break;
    }
  }
  
  // Check for QR code indicators (in image alt text, etc.)
  const qrPatterns = [
    /qr[\s-]?code/gi,
    /scan.*code/gi,
    /authentication.*app/gi
  ];
  
  for (const pattern of qrPatterns) {
    if (pattern.test(content)) {
      hits.push({
        label: 'QR Code Reference',
        severity: 25,
        snippet: 'QR code mentioned'
      });
      break;
    }
  }
  
  return hits;
}