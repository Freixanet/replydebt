# ReplyDebt

Local-first inbox debt tracker. Upload a screenshot of your messaging app inbox and get a dashboard of likely pending replies.

## Prerequisites

- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/apikey) API key

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env example and add your API key:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:

   ```
   GOOGLE_AI_API_KEY=your_key_here
   ```

   To test **without** a Google API key, see [Test without Google API key](#test-without-google-api-key) below.

## Run

First time or if dev feels stuck compiling:

```bash
npm run dev:clean
```

Normal dev:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Dev uses **Webpack** (not Turbopack) and ignores `src-tauri/standalone/` so desktop build artifacts do not slow the file watcher. Use `npm run dev:turbo` only if you want Turbopack.

If you previously ran `npm run build:desktop`, delete the heavy standalone copy with `npm run clean` before web dev.

If Next.js warns about multiple lockfiles and picks your home folder as the workspace root, remove any stray `~/package-lock.json` (not part of this project). `next.config.ts` pins the project root so the watcher does not scan your entire home directory.

## GitHub Pages demo

Live demo: [https://freixanet.github.io/replydebt/](https://freixanet.github.io/replydebt/)

GitHub Pages serves static files only, so the hosted demo runs in **browser-only mode**:

- Mock screenshot analysis (no Gemini API key on the server)
- Data stored in `localStorage` in your browser
- Full UI: dashboard, onboarding, priority contacts, guided scan

For live Gemini analysis and SQLite storage, run locally with `npm run dev` or use the desktop app.

Deploys automatically from `main` via GitHub Actions (`.github/workflows/deploy-pages.yml`). Build locally with:

```bash
npm run build:pages
```

Output goes to `out/`. In the repo settings, set **Pages → Build and deployment → Source** to **GitHub Actions** if it is not already.

## Desktop app (Tauri)

ReplyDebt can run as a native macOS app. The desktop build wraps the same Next.js app: in dev it connects to `next dev`; in production it bundles a local Next.js standalone server + Node runtime.

### Prerequisites (Mac desktop)

- [Rust](https://rustup.rs/)
- Xcode Command Line Tools: `xcode-select --install`

### Desktop dev mode

Runs Next.js and opens a native window:

```bash
npm run dev:desktop
```

Web dev mode is unchanged:

```bash
npm run dev
```

### Build a local Mac app

```bash
npm run build:desktop
```

Output: `src-tauri/target/release/bundle/macos/ReplyDebt.app`

Open the `.app` from Finder. Without code signing, macOS may show an “unidentified developer” warning — use **Open Anyway** in System Settings or right-click → Open.

### Desktop data location

- **Web dev:** `./data/replydebt.db` (project folder)
- **Desktop app:** `~/Library/Application Support/com.replydebt.app/replydebt.db`
- **Captured screenshots:** app cache folder (`captures/` under ReplyDebt cache)

### Screen capture (desktop only)

In the desktop app, **Analyze** and **Guided Scan** show a **Capture Current Screen** button. It captures the **main display once** when clicked — no background monitoring, no automatic app switching.

**Required permission:** macOS **Screen Recording** (System Settings → Privacy & Security → Screen Recording → enable ReplyDebt).

#### How to test capture

1. Run `npm run dev:desktop`
2. Open **Analyze** or **Guided Scan**
3. Switch to your messaging inbox on the primary display
4. Click **Capture Current Screen** and grant Screen Recording if prompted
5. Confirm the preview appears, select the source app, then click **Analyze**

Manual upload/drag-and-drop remains available as fallback.

#### Capture failure modes

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| Button not visible | Using web dev (`npm run dev`) | Use `npm run dev:desktop` |
| Permission error | Screen Recording disabled | Enable ReplyDebt in Screen Recording settings |
| Wrong content captured | Inbox not on primary display | Switch to inbox before clicking Capture |
| Black or empty image | Permission not granted yet | Retry after enabling permission |
| Capture OK, analyze fails | Missing Google API key | Use `ANALYZE_MODE=mock` in `.env.local` |

### Desktop limitations

- No code signing (Gatekeeper may block on first launch)
- Build is architecture-specific (Apple Silicon vs Intel)
- Bundle size ~80–120 MB (includes Node.js runtime)
- No auto-updater
- Screen capture is macOS desktop only; web dev uses manual upload
- First launch may take 1–3 seconds while the internal server starts
- `better-sqlite3` must be built on the same machine/architecture as the desktop build

## Test with one screenshot

1. On your phone or desktop, open a messaging app (WhatsApp, Telegram, Instagram, Messenger, or Messages).
2. Navigate to the **conversation list** (inbox view), not an open chat.
3. Take a screenshot showing several conversations.
4. In ReplyDebt:
   - Select the matching source app.
   - Upload the screenshot.
   - Click **Analyze inbox**.
5. Verify the dashboard shows four buckets: **Pending**, **Review**, **Done**, and **Snoozed**.
6. Check each card shows: app, contact name, preview, timestamp, last sender, confidence, status, and reason.
7. Use item actions: **Done**, **Snooze 1h**, **Snooze 24h**, **Ignore**, **High priority**, **Reset**.

## Test persistence

1. Analyze a screenshot and move one item to **Done**, snooze another, ignore a contact.
2. Hard refresh the browser (Cmd+R) — items should remain in the same buckets.
3. Stop the dev server (`Ctrl+C`) and run `npm run dev` again — open [http://localhost:3000](http://localhost:3000); saved items should still appear.
4. Local database file: `data/replydebt.db`. Delete it to reset all saved state.

## Test without Google API key

ReplyDebt cannot call Cursor's AI from the Analyze button. For local testing without Gemini, use one of these options:

### Option 1: Mock mode (fastest)

1. In `.env.local`:

   ```
   ANALYZE_MODE=mock
   ```

2. Restart `npm run dev`.
3. Open **Analyze**, pick a source app, and click **Analyze inbox** (screenshot optional).
4. The dashboard fills with sample pending/review items. OTP and newsletter rows are filtered out automatically.

### Option 2: Paste JSON from Cursor (real screenshot, no Gemini)

1. In `.env.local`:

   ```
   DEV_JSON_IMPORT=1
   ```

2. Restart `npm run dev`.
3. Share your inbox screenshot in Cursor chat and ask for JSON only, matching this shape:

   ```json
   {
     "items": [
       {
         "contactName": "Alex",
         "preview": "Are you free tomorrow?",
         "timestampText": "Yesterday",
         "likelyLastSender": "them",
         "confidence": 0.92,
         "reason": "Direct question from contact"
       }
     ]
   }
   ```

   `likelyLastSender` must be `"me"`, `"them"`, or `"unknown"`. `confidence` is 0–1.

4. In ReplyDebt, open **Analyze** → expand **Paste model JSON (dev)** → paste the JSON → **Analyze inbox** (screenshot optional).

## Run a full guided scan

Guided Scan walks you through all five messaging apps in order: WhatsApp → Telegram → Instagram → Messenger → Messages. Upload is manual — no automatic screen capture.

1. Start the app (`npm run dev`) with mock mode if you have no Google API key (`ANALYZE_MODE=mock` in `.env.local`).
2. Click **Start Guided Scan** in the header.
3. For each app step:
   - Read the on-screen instructions (open the **conversation list**, not a single chat).
   - Take a screenshot on your phone or desktop.
   - Upload it in the modal and click **Analyze screenshot** (screenshot optional in mock mode).
   - Or click **Skip this app** to move on without scanning.
4. Use the app chips (WA, TG, IG, FB, MSG) to **rescan** any app — click a chip, upload a new screenshot, analyze again.
5. Click **Stop for now** to pause; a **Resume** banner appears on the dashboard until you finish.
6. After all five apps are scanned or skipped, review the summary and click **View pending list** — results merge into the normal **Pending** tab.
7. Rescanning the same contact with the same preview does not create duplicate items.

Hard refresh or restart the server — scanned items persist in SQLite; an in-progress guided scan can be resumed from the banner.

## What it does not do

- No auth, payments, or message sending
- No message draft generation
- No integration with WhatsApp, Meta, or Telegram APIs
- No cloud sync (SQLite is local only)

## Tech stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Google Gemini 2.5 Flash (vision)
- SQLite (better-sqlite3) for local persistence
