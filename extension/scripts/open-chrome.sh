#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

if [[ ! -d "$DIST" ]]; then
  echo "Building extension first..."
  (cd "$ROOT" && npm run build)
fi

CHROME_APP="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [[ ! -x "$CHROME_APP" ]]; then
  echo "Google Chrome not found at $CHROME_APP"
  echo "Load manually: chrome://extensions → Load unpacked → $DIST"
  exit 1
fi

echo "Opening Chrome with ReplyDebt from $DIST"
"$CHROME_APP" \
  --load-extension="$DIST" \
  "https://web.whatsapp.com/" \
  >/dev/null 2>&1 &

echo "Chrome launched. If the extension did not appear, load $DIST manually once in chrome://extensions."
