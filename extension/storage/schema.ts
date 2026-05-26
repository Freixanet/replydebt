export const SOURCE_APPS = [
  "whatsapp",
  "telegram",
  "instagram",
  "messenger",
] as const;

export type SourceApp = (typeof SOURCE_APPS)[number];

export type LastSender = "me" | "them" | "unknown";

export type RequiresReply = true | false | "review";

export type ItemStatus = "pending" | "review" | "done" | "ignored";

export type ItemAction = "done" | "ignore_contact" | "reset_status";

export type SelectorTier = 1 | 2 | 3 | 4 | "none";

export type DetectionState = "ok" | "unknown" | "broken";

export interface DetectedConversation {
  contactName: string;
  preview: string;
  timestampText: string;
  likelyLastSender: LastSender;
  confidence: number;
  reason: string;
  isUnread?: boolean;
}

export interface DetectionResult {
  items: DetectedConversation[];
  tierUsed: SelectorTier;
  visibleCount: number;
  failed: boolean;
}

export interface PendingItemRecord {
  id: string;
  app: SourceApp;
  contactName: string;
  preview: string;
  timestampText: string;
  likelyLastSender: LastSender;
  requiresReply: RequiresReply;
  confidence: number;
  reason: string;
  status: ItemStatus;
  lastSeenAt: number;
  firstDetectedAt: number;
  selectorTierUsed: SelectorTier;
}

export interface AppHealthRecord {
  lastSuccessfulScan: number | null;
  consecutiveFailures: number;
  selectorTierUsed: SelectorTier;
  itemsDetectedLastScan: number;
  detectionState: DetectionState;
  lastFailureLoggedAt: number | null;
}

export type HealthStore = Record<SourceApp, AppHealthRecord>;

export interface CoverageRecord {
  app: SourceApp;
  scannedVisible: number;
  estimatedVisible: number;
  lastScanAt: number;
}

export interface ScanPayload {
  app: SourceApp;
  result: DetectionResult;
  coverage: CoverageRecord;
  scannedAt: number;
}

export interface ExtensionStore {
  items: PendingItemRecord[];
  health: HealthStore;
  coverage: Partial<Record<SourceApp, CoverageRecord>>;
  selectorFailures: Array<{
    app: SourceApp;
    at: number;
    tierUsed: SelectorTier;
  }>;
}

export const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const HEALTH_FAILURE_THRESHOLD: Record<SourceApp, number> = {
  whatsapp: 3,
  telegram: 3,
  messenger: 3,
  instagram: 2,
};

export const SOURCE_APP_LABELS: Record<SourceApp, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  instagram: "Instagram",
  messenger: "Messenger",
};

export function itemKey(app: SourceApp, contactName: string): string {
  return `${app}:${contactName.trim().toLowerCase()}`;
}

export function isSourceApp(value: string): value is SourceApp {
  return (SOURCE_APPS as readonly string[]).includes(value);
}

export function createDefaultHealth(): HealthStore {
  const base: AppHealthRecord = {
    lastSuccessfulScan: null,
    consecutiveFailures: 0,
    selectorTierUsed: "none",
    itemsDetectedLastScan: 0,
    detectionState: "unknown",
    lastFailureLoggedAt: null,
  };

  return {
    whatsapp: { ...base },
    telegram: { ...base },
    instagram: { ...base },
    messenger: { ...base },
  };
}

export function createEmptyStore(): ExtensionStore {
  return {
    items: [],
    health: createDefaultHealth(),
    coverage: {},
    selectorFailures: [],
  };
}
