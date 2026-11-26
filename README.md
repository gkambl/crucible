# Crucible

**Local-first suspicious-content analyser.** Drop a file, paste text or browse, and Crucible scores it for phishing and leaked secrets. Analysis runs in your browser. Nothing is uploaded.

## What it checks
- **URLs:** suspicious and phishing-style links
- **Language lures:** urgency and pressure wording typical of phishing
- **HTML content:** risky markup in pasted or attached HTML
- **Secrets:** credentials and keys accidentally present in text
- **Email identity headers:** the `From` display name, address and domain
- **Risk score:** a 0 to 100 score with a verdict and plain-language reasons, weighted so the strongest signals count most

## Privacy by design
- Runs in a Web Worker in the browser; no server, no upload
- Sensitive values are redacted in the results
- Results are erased on `Esc`, with the **Erase All** button, when the page is closed, and after 10 minutes with the tab hidden
- Allowlist of trusted domains you can adjust in Settings
- Accepted files: `.txt` `.log` `.md` `.csv` `.json` `.jsonl` `.html` `.eml` `.pdf`, up to 3 MB

## Run it
```bash
npm install
npm run dev     # local dev server
npm run build   # production build
```

## Stack
React 18, TypeScript, Vite, Tailwind CSS, Web Workers.

## Status
Personal project.

Built by [Gouresh Kamble](https://github.com/gkambl).
