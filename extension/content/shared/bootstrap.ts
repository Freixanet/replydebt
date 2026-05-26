import type { SourceApp } from "../../storage/schema";
import { detectInstagramConversations } from "./apps/instagram-detect";
import { detectMessengerConversations } from "./apps/messenger-detect";
import { detectTelegramConversations } from "./apps/telegram-detect";
import { detectWhatsAppConversations } from "./apps/whatsapp-detect";
import {
  attachIncrementalScan,
  logSelectorFailure,
  sendScanResult,
} from "./runtime";

function findListRoot(app: SourceApp): Element | null {
  switch (app) {
    case "whatsapp":
      return (
        document.querySelector('[data-testid="chat-list"]') ??
        document.querySelector('[role="grid"]') ??
        document.querySelector('[role="list"]')
      );
    case "telegram":
      return (
        document.querySelector('[role="list"]') ??
        document.querySelector("main")
      );
    case "messenger":
      return (
        document.querySelector('[role="grid"]') ??
        document.querySelector('[role="list"]') ??
        document.querySelector('[role="main"]')
      );
    case "instagram":
      return (
        document.querySelector('[role="main"]') ??
        document.querySelector("main")
      );
    default:
      return null;
  }
}

function runDetection(app: SourceApp) {
  const detectors = {
    whatsapp: detectWhatsAppConversations,
    telegram: detectTelegramConversations,
    messenger: detectMessengerConversations,
    instagram: detectInstagramConversations,
  } as const;

  const result = detectors[app]();

  if (result.failed || result.tierUsed === "none") {
    logSelectorFailure(app, `tier=${result.tierUsed}`);
  }

  sendScanResult({
    app,
    result,
    coverage: {
      app,
      scannedVisible: result.items.length,
      estimatedVisible: result.visibleCount,
      lastScanAt: Date.now(),
    },
    scannedAt: Date.now(),
  });
}

export function initAppDetector(app: SourceApp): void {
  const scan = () => runDetection(app);
  const listRoot = findListRoot(app);

  attachIncrementalScan(listRoot, scan);
}
