import { DetectionHit } from '../types';

const URGENCY_PATTERNS = [
  'urgent', 'immediate', 'asap', 'expires today', 'act now', 'limited time',
  'hurry', 'don\'t delay', 'expires soon', 'time sensitive', 'critical',
  'emergency', 'action required', 'respond immediately'
];

const MFA_RESET_PATTERNS = [
  'reset password', 'change password', 'password expired', 'account locked',
  'security alert', 'suspicious activity', 'verify account', 'confirm identity',
  'two-factor', '2fa', 'authentication', 'verify login', 'unusual sign'
];

const PAYROLL_PATTERNS = [
  'payroll', 'direct deposit', 'w-2', 'tax form', 'salary', 'bonus',
  'payment method', 'bank account', 'routing number', 'ach', 'wire transfer'
];

const CREDENTIAL_KEYWORDS = [
  'username', 'password', 'login', 'sign in', 'credentials', 'account access',
  'user id', 'pin', 'security code', 'access code', 'verification code'
];

export function analyzeLanguageLures(content: string): DetectionHit[] {
  const hits: DetectionHit[] = [];
  const lowerContent = content.toLowerCase();
  
  // Check for urgency patterns
  let urgencyCount = 0;
  for (const pattern of URGENCY_PATTERNS) {
    if (lowerContent.includes(pattern)) {
      urgencyCount++;
      hits.push({
        label: 'Urgency Language',
        severity: 35,
        snippet: pattern
      });
    }
  }
  
  // Check for MFA/reset patterns
  for (const pattern of MFA_RESET_PATTERNS) {
    if (lowerContent.includes(pattern)) {
      hits.push({
        label: 'Account Security Lure',
        severity: 45,
        snippet: pattern
      });
    }
  }
  
  // Check for payroll patterns
  for (const pattern of PAYROLL_PATTERNS) {
    if (lowerContent.includes(pattern)) {
      hits.push({
        label: 'Financial/Payroll Lure',
        severity: 50,
        snippet: pattern
      });
    }
  }
  
  // Check for credential harvesting
  let credentialCount = 0;
  for (const pattern of CREDENTIAL_KEYWORDS) {
    if (lowerContent.includes(pattern)) {
      credentialCount++;
    }
  }
  
  if (credentialCount >= 2) {
    hits.push({
      label: 'Credential Harvesting Indicators',
      severity: 60,
      snippet: `${credentialCount} credential keywords found`
    });
  }
  
  // Multiple urgency indicators = higher severity
  if (urgencyCount >= 3) {
    hits.push({
      label: 'Multiple Urgency Indicators',
      severity: 55,
      snippet: `${urgencyCount} urgency patterns detected`
    });
  }
  
  return hits;
}