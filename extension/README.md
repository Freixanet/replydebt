# ReplyDebt Chrome Extension

Manifest V3 extension that scans visible inbox rows on messaging web apps and tracks likely pending replies locally.

## Build

```bash
cd extension
npm install
npm run dev      # watch build → load dist/ in chrome://extensions
npm run build    # production build
```

Load unpacked: `chrome://extensions` → Developer mode → Load unpacked → select `extension/dist`.

## Supported apps

| App | URL | Primary tier |
|-----|-----|--------------|
| WhatsApp | web.whatsapp.com | Tier 1 (`data-testid`) |
| Telegram | web.telegram.org | Tier 1 (ARIA/list structure) |
| Messenger | messenger.com | Tier 2 (React Fiber) |
| Instagram DMs | instagram.com/direct | Tier 2 (React Fiber) |

## Architecture

- **No CSS class selectors** — ARIA / `data-testid` → React Fiber → structure → text heuristics
- **Accumulative state** — scrolled-off pending rows stay pending until Done or `lastSender = me`
- **7-day TTL** for stale unseen entries
- **Health monitoring** — consecutive failures → broken/unknown state (not false zero)
- **No network calls** — `chrome.storage.local` only

See `privacy-policy.md` for Chrome Web Store compliance.

## Test content scripts in isolation

1. Build/load the extension
2. Open the target app and sign in
3. Open DevTools → Console on that tab
4. Scroll the inbox list naturally — scans run on scroll + DOM mutations (no auto-scroll)
5. Open the extension popup to inspect pending items and health tier per app
6. To simulate failure, open an unsupported sub-page (e.g. Instagram outside `/direct`) and confirm health moves toward `unknown`

## Chrome Web Store minimum steps

1. Create a [Chrome Web Store developer account](https://chrome.google.com/webstore/devconsole) ($5 one-time)
2. Run `npm run build` and zip the `dist/` folder
3. Upload zip in Developer Dashboard → New item
4. Add listing text, screenshots of popup + privacy disclosure
5. Link to `privacy-policy.md` (host it on GitHub Pages or in-repo)
6. Declare narrow host permissions with justification (already in manifest)
7. Submit for review — expect questions about reading third-party page data; point to local-only storage and metadata-only extraction

## Detection fragility (most likely to break first)

1. **Instagram DMs** — updates frequently, no stable `data-testid`, Fiber shape changes often (threshold: 2 failures)
2. **Messenger** — React Fiber props rename between releases
3. **WhatsApp** — `data-testid` values change less often but still shift; Tier 2 Fiber fallback helps
4. **Telegram** — most stable semantic HTML/ARIA of the four
