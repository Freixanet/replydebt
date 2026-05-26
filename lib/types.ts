export const SOURCE_APPS = [
  "whatsapp",
  "telegram",
  "instagram",
  "messenger",
  "messages",
] as const;

export type SourceApp = (typeof SOURCE_APPS)[number];

export type LastSender = "me" | "them" | "unknown";

export type RequiresReply = true | false | "review";

export type Priority = "high" | "medium" | "low";

export type ItemStatus = "pending" | "review" | "done" | "snoozed" | "ignored";

export type ReplyWindow = "6h" | "24h" | "3d" | "7d";

export const REPLY_WINDOW_HOURS: Record<ReplyWindow, number> = {
  "6h": 6,
  "24h": 24,
  "3d": 72,
  "7d": 168,
};

export const REPLY_WINDOW_OPTIONS: ReplyWindow[] = ["6h", "24h", "3d", "7d"];

export function replyWindowFromHours(hours: number): ReplyWindow {
  const entry = Object.entries(REPLY_WINDOW_HOURS).find(
    ([, value]) => value === hours,
  );
  return (entry?.[0] as ReplyWindow | undefined) ?? "24h";
}

export type ItemAction =
  | "done"
  | "snooze_1h"
  | "snooze_24h"
  | "ignore_contact"
  | "set_priority"
  | "restore_contact"
  | "reset_status";

export interface InboxItem {
  contactName: string;
  preview: string;
  timestampText: string;
  likelyLastSender: LastSender;
  requiresReply: RequiresReply;
  confidence: number;
  reason: string;
}

export interface PriorityContact {
  id: string;
  name: string;
  apps: SourceApp[];
  priority: Priority;
  replyWindow: ReplyWindow;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingItemRecord extends InboxItem {
  id: string;
  scanId: string;
  app: SourceApp;
  status: ItemStatus;
  snoozedUntil: string | null;
  priority: Priority;
  replyWindowHours?: number | null;
  isOverdue?: boolean;
  matchedPriorityContactId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScanSummary {
  id: string;
  app: SourceApp;
  screenshotFileName: string;
  createdAt: string;
}

export interface DashboardData {
  pending: PendingItemRecord[];
  review: PendingItemRecord[];
  done: PendingItemRecord[];
  snoozed: PendingItemRecord[];
  ignored: PendingItemRecord[];
  recentScans: ScanSummary[];
  latestScanRawOutput: string | null;
  latestScanAt: string | null;
  totalItems: number;
  priorityContacts: PriorityContact[];
  onboardingCompleted: boolean;
  topThreeToday: PendingItemRecord[];
}

export interface AnalysisResult {
  sourceApp: SourceApp;
  items: InboxItem[];
  analyzedAt: string;
  rawModelOutput?: string;
  warnings?: string[];
  parseStatus?: "ok" | "partial" | "failed";
}

export interface BucketedItems {
  pending: InboxItem[];
  review: InboxItem[];
  notPending: InboxItem[];
}

export function isSourceApp(value: string): value is SourceApp {
  return (SOURCE_APPS as readonly string[]).includes(value);
}

export function bucketItems(items: InboxItem[]): BucketedItems {
  return {
    pending: items.filter((item) => item.requiresReply === true),
    review: items.filter((item) => item.requiresReply === "review"),
    notPending: items.filter((item) => item.requiresReply === false),
  };
}

export const SOURCE_APP_LABELS: Record<SourceApp, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  instagram: "Instagram",
  messenger: "Messenger",
  messages: "Messages",
};

export type GuidedScanAppStatus = "pending" | "scanned" | "skipped";

export type GuidedScanAppStates = Record<SourceApp, GuidedScanAppStatus>;

export interface GuidedScanSession {
  id: string;
  status: "active" | "completed";
  currentAppIndex: number;
  currentApp: SourceApp;
  appStates: GuidedScanAppStates;
  completedCount: number;
  totalApps: number;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
}
