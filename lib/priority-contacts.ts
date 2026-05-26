import { classifyRequiresReply } from "./classify-items";
import type {
  InboxItem,
  PendingItemRecord,
  Priority,
  PriorityContact,
  SourceApp,
} from "./types";

const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 100,
  medium: 50,
  low: 10,
};

export function normalizeContactName(name: string): string {
  return name.trim().toLowerCase();
}

export function matchPriorityContact(
  name: string,
  app: SourceApp,
  contacts: PriorityContact[],
): PriorityContact | null {
  const normalized = normalizeContactName(name);

  for (const contact of contacts) {
    if (normalizeContactName(contact.name) !== normalized) {
      continue;
    }

    if (contact.apps.length === 0 || contact.apps.includes(app)) {
      return contact;
    }
  }

  return null;
}

export function applyPriorityBoost(
  item: InboxItem,
  match: PriorityContact,
): InboxItem {
  const boostedConfidence = Math.min(1, item.confidence + 0.15);
  const reason = item.reason.includes("priority contact")
    ? item.reason
    : `${item.reason} · priority contact`;

  const requiresReply =
    item.likelyLastSender === "them"
      ? classifyRequiresReply(item.likelyLastSender, boostedConfidence)
      : item.requiresReply;

  return {
    ...item,
    confidence: boostedConfidence,
    reason,
    requiresReply,
  };
}

export function isItemOverdue(
  item: Pick<PendingItemRecord, "status" | "updatedAt">,
  replyWindowHours: number | null | undefined,
  now = Date.now(),
): boolean {
  if (item.status !== "pending" || !replyWindowHours) {
    return false;
  }

  const pendingMs = now - new Date(item.updatedAt).getTime();
  return pendingMs > replyWindowHours * 60 * 60 * 1000;
}

function scorePendingItem(
  item: PendingItemRecord,
  now = Date.now(),
): number {
  let score = PRIORITY_WEIGHT[item.priority];
  score += item.confidence * 10;

  if (item.replyWindowHours && item.status === "pending") {
    const pendingMs = now - new Date(item.updatedAt).getTime();
    const windowMs = item.replyWindowHours * 60 * 60 * 1000;
    if (pendingMs > windowMs) {
      const hoursOverdue = (pendingMs - windowMs) / (60 * 60 * 1000);
      score += Math.min(hoursOverdue, 48) * 2;
    }
  }

  return score;
}

export function computeTopThreeToday(
  pending: PendingItemRecord[],
): PendingItemRecord[] {
  const bestByContact = new Map<string, { item: PendingItemRecord; score: number }>();
  const now = Date.now();

  for (const item of pending) {
    const key = normalizeContactName(item.contactName);
    const score = scorePendingItem(item, now);
    const existing = bestByContact.get(key);

    if (!existing || score > existing.score) {
      bestByContact.set(key, { item, score });
    }
  }

  return [...bestByContact.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.item);
}

export function enrichPendingItem(
  item: PendingItemRecord,
  contacts: PriorityContact[],
  now = Date.now(),
): PendingItemRecord {
  const match = matchPriorityContact(item.contactName, item.app, contacts);

  const replyWindowHours = match
    ? match.replyWindow === "6h"
      ? 6
      : match.replyWindow === "24h"
        ? 24
        : match.replyWindow === "3d"
          ? 72
          : 168
    : null;

  const isOverdue = isItemOverdue(
    { status: item.status, updatedAt: item.updatedAt },
    replyWindowHours,
    now,
  );

  return {
    ...item,
    replyWindowHours,
    isOverdue,
    matchedPriorityContactId: match?.id ?? null,
  };
}
