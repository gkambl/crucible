const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;
const SSN_REGEX = /\b\d{3}-?\d{2}-?\d{4}\b/g;
const HIGH_ENTROPY_TOKEN_REGEX = /\b[A-Za-z0-9_-]{32,64}\b/g;
const API_KEY_PATTERNS = [
  /\bsk_[a-zA-Z0-9]{24,}/g,
  /\bAPI[_-]?KEY[_-]?[A-Za-z0-9]{16,}/gi,
  /\bsecret[_-]?key[_-]?[A-Za-z0-9]{16,}/gi,
  /\btoken[_-]?[A-Za-z0-9]{16,}/gi,
];

function isLuhnValid(num: string): boolean {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 13) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

function redactEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (username.length <= 3) return `${username[0]}***@${domain}`;
  return `${username[0]}***@${domain}`;
}

function redactCreditCard(card: string): string {
  const digits = card.replace(/\D/g, '');
  if (!isLuhnValid(digits)) return card;
  return `•••• •••• •••• ${digits.slice(-4)}`;
}

function redactSSN(ssn: string): string {
  const digits = ssn.replace(/\D/g, '');
  if (digits.length !== 9) return ssn;
  return `***-**-${digits.slice(-4)}`;
}

function redactToken(token: string): string {
  if (token.length < 16) return token;
  return `${token.substring(0, 4)}****${token.substring(token.length - 4)}`;
}

export function redactSensitiveData(text: string): string {
  let redacted = text;
  
  // Redact emails
  redacted = redacted.replace(EMAIL_REGEX, redactEmail);
  
  // Redact credit cards
  redacted = redacted.replace(CREDIT_CARD_REGEX, (match) => {
    return redactCreditCard(match);
  });
  
  // Redact SSNs
  redacted = redacted.replace(SSN_REGEX, redactSSN);
  
  // Redact API keys and tokens
  API_KEY_PATTERNS.forEach(pattern => {
    redacted = redacted.replace(pattern, redactToken);
  });
  
  // Redact high-entropy tokens
  redacted = redacted.replace(HIGH_ENTROPY_TOKEN_REGEX, (match) => {
    // Check if it looks like a token (high entropy)
    const entropy = calculateEntropy(match);
    if (entropy > 4.0) {
      return redactToken(match);
    }
    return match;
  });
  
  return redacted;
}

export function calculateEntropy(str: string): number {
  const frequency: Record<string, number> = {};
  
  for (const char of str) {
    frequency[char] = (frequency[char] || 0) + 1;
  }
  
  const length = str.length;
  let entropy = 0;
  
  for (const count of Object.values(frequency)) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

export function preserveContext(text: string, position: number, contextLength: number = 24): string {
  const start = Math.max(0, position - contextLength);
  const end = Math.min(text.length, position + contextLength);
  return text.substring(start, end);
}