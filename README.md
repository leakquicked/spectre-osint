![Deploy SPECTRE to GitHub Pages](https://github.com/leakquicked/spectre-osint/actions/workflows/pages.yml/badge.svg)

# SPECTRE — Intelligence Workbench

A privacy-first, browser-native cyber intelligence toolkit for learning, public-data research and defensive analysis.

**Live app:** https://leakquicked.github.io/spectre-osint/

## Modules

- **Domain intelligence** — public RDAP registration snapshot.
- **IP intelligence** — public network owner, ASN and approximate region (ipwho.is).
- **DNS records** — A, AAAA, MX, TXT, NS, CNAME and CAA via Cloudflare DNS-over-HTTPS.
- **URL screening** — local heuristic review; does not visit or reputation-check a target.
- **Hash utility** — SHA-256 for text and files using Web Crypto.
- **Password audit** — local strength estimate; input is never sent or stored.
- **File metadata** — basic local file properties and image dimensions.
- **Case notes** — local-only notes with JSON export.

## Languages

English, Russian and Kazakh. Switch language from the top-right selector.

## Run locally

No build step or dependencies are required. Open `index.html`, or run:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Privacy model

- No account, analytics, telemetry or backend.
- Case notes are stored in the current browser's `localStorage`.
- Password analysis, URL heuristics, file inspection and hashing run locally.
- Domain, IP and DNS modules make requests to their clearly identified public data providers.
- Never enter real passwords, API keys, private data or sensitive files into a research tool.

## Limitations

- RDAP and public DNS/IP providers may rate-limit requests or change CORS policies.
- IP geolocation is approximate and does not identify a person's exact location.
- URL screening is heuristic only, not a malware scan or a verified reputation verdict.
- File metadata inspection is intentionally lightweight and is not a forensic EXIF parser.
- Password scoring is educational and does not check breach databases.

## Responsible use

Use SPECTRE only with public information and systems you own or are explicitly authorized to assess. Do not use it to target, stalk, deanonymize or access other people's accounts or devices.

## License

MIT
