# ReplyDebt Privacy Policy

Last updated: May 26, 2026

ReplyDebt is a Chrome extension that helps you track likely pending replies in supported messaging web apps.

## What data is read

ReplyDebt reads **conversation metadata from the visible inbox list** on pages you visit:

- Contact or thread name
- Last message preview text shown in the inbox row
- Timestamp text shown in the inbox row
- Unread indicators and sender hints derived from DOM/ARIA/React metadata (for example message status icons or "You:" prefixes)

ReplyDebt does **not** open individual chat threads to harvest full message history.

## What is never collected

ReplyDebt never collects, stores, or transmits:

- Full message history
- Message media (photos, videos, voice notes, files)
- Phone numbers, email addresses, or account credentials
- Location data
- Analytics or telemetry
- Any data to external servers

There are **no network requests** from ReplyDebt content scripts or background logic except Chrome extension APIs.

## Where data is stored

All ReplyDebt data is stored locally on your device using `chrome.storage.local`:

- Pending/review/done conversation records
- Detection health status per app
- Scan coverage indicators
- Selector failure logs for self-monitoring

Data is **not synced** to your Google account via Chrome Sync.

## How data is used

Local data is used only to:

- Show your pending reply dashboard in the extension popup
- Merge incremental scans as you scroll through inbox lists
- Warn you when detection selectors may have broken after an app UI update

## Permissions justification

- `storage`: save local dashboard state
- `alarms`: optional periodic health reminders
- `notifications`: optional local reminders about pending replies or broken detection
- Host permissions for WhatsApp/Telegram/Messenger/Instagram: run DOM-based inbox scanners on those sites only

## How to uninstall and delete all data

1. Remove the extension from `chrome://extensions`
2. Optionally click **Clear data** in the ReplyDebt popup before uninstalling
3. Uninstalling the extension removes `chrome.storage.local` entries created by ReplyDebt

## Contact

Issues and privacy questions: https://github.com/Freixanet/replydebt/issues

## Changes

Material changes to this policy will be reflected in the extension repository and Chrome Web Store listing notes.
