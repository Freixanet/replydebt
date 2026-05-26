import type {
  LastSender,
  Priority,
  RequiresReply,
  SourceApp,
} from "@/lib/types";

export type ItemStatus = "pending" | "review" | "done" | "snoozed" | "ignored";

export type ItemAction =
  | "done"
  | "snooze_1h"
  | "snooze_24h"
  | "ignore_contact"
  | "set_priority"
  | "restore_contact"
  | "reset_status";

export interface ContactThreadRow {
  id: string;
  app: SourceApp;
  contactName: string;
  priority: Priority;
  ignored: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScanRow {
  id: string;
  app: SourceApp;
  screenshotFileName: string;
  createdAt: string;
  rawModelOutputJson: string | null;
}

export interface PendingItemRow {
  id: string;
  scanId: string;
  contactThreadId: string;
  app: SourceApp;
  contactName: string;
  preview: string;
  timestampText: string;
  likelyLastSender: LastSender;
  requiresReply: RequiresReply;
  confidence: number;
  reason: string;
  status: ItemStatus;
  snoozedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  priority: Priority;
  contactIgnored: number;
}

export function requiresReplyToString(value: RequiresReply): string {
  if (value === true) return "true";
  if (value === false) return "false";
  return "review";
}

export function stringToRequiresReply(value: string): RequiresReply {
  if (value === "true") return true;
  if (value === "false") return false;
  return "review";
}

export function requiresReplyToInitialStatus(
  requiresReply: RequiresReply,
): ItemStatus {
  if (requiresReply === true) return "pending";
  if (requiresReply === "review") return "review";
  return "done";
}
