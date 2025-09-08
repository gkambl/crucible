// src/config/allowlist.ts
// Minimal, opinionated defaults. KEEP SMALL. Your team can edit in the UI.

export type Allowlist = {
  domains: string[]; // host or suffix (e.g. "ledger.com", ".gov.uk")
  senders: string[]; // exact email addresses (lowercased)
};

export const DEFAULT_ALLOWLIST: Allowlist = {
  domains: [
    // Government suffixes (broad, but intentional)
    ".gov.uk",
    ".nhs.uk",
    ".gov",

    // Your org & partners (examples; replace with yours)
    "yourcompany.com",

    // A FEW legit finance/crypto you actually interact with
    "paypal.com",
    "revolut.com",
    "wise.com",
    "ledger.com",
    "trezor.io",
    "coinbase.com",
    "kraken.com",
  ],
  senders: [
    // Exact, vetted addresses (examples; trim these down to what you truly trust)
    "no-reply@paypal.com",
    "support@ledger.com",
  ],
};
