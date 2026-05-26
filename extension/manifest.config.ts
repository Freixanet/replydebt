import type { ManifestV3Export } from "@crxjs/vite-plugin";

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: "ReplyDebt",
  version: "0.1.0",
  description:
    "Detect likely pending replies in WhatsApp, Telegram, Messenger, and Instagram DMs. All data stays on your device.",
  permissions: ["storage", "alarms", "notifications"],
  host_permissions: [
    "https://web.whatsapp.com/*",
    "https://web.telegram.org/*",
    "https://www.messenger.com/*",
    "https://www.instagram.com/*",
  ],
  background: {
    service_worker: "background/service-worker.ts",
    type: "module",
  },
  action: {
    default_popup: "popup/index.html",
    default_title: "ReplyDebt",
  },
  content_scripts: [
    {
      matches: ["https://web.whatsapp.com/*"],
      js: ["content/whatsapp.ts"],
      run_at: "document_idle",
    },
    {
      matches: ["https://web.telegram.org/*"],
      js: ["content/telegram.ts"],
      run_at: "document_idle",
    },
    {
      matches: ["https://www.messenger.com/*"],
      js: ["content/messenger.ts"],
      run_at: "document_idle",
    },
    {
      matches: ["https://www.instagram.com/*"],
      js: ["content/instagram.ts"],
      run_at: "document_idle",
    },
  ],
  icons: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
};

export default manifest;
