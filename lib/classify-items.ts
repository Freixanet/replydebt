import { getAppIgnoreKeywords } from "./prompts/index";
import {
  matchPriorityContact,
} from "./priority-contacts";
import type { InboxItem, PriorityContact, RequiresReply, SourceApp } from "./types";
import type { ClassifyOutcome, RawModelItem } from "./vision-schema";

export const CONFIDENCE_THRESHOLD = 0.7;

const IGNORE_PATTERNS: RegExp[] = [
  /\b\d{4,8}\b.*\b(code|otp|pin|verification)\b/i,
  /\b(code|otp|pin|verification)\b.*\b\d{4,8}\b/i,
  /\b(one[- ]time|verification code|security code)\b/i,
  /\b(delivered|out for delivery|tracking|shipment|package)\b/i,
  /\b(unsubscribe|newsletter|promo|promotion|% off|sale ends)\b/i,
  /\b(channel|broadcast|notification|alert|system message)\b/i,
  /\b(bot|automated message|do not reply)\b/i,
  /waiting for this message/i,
];

export function shouldIgnoreItem(
  contactName: string,
  preview: string,
  sourceApp?: SourceApp,
  priorityContacts: PriorityContact[] = [],
): boolean {
  if (sourceApp) {
    const match = matchPriorityContact(contactName, sourceApp, priorityContacts);
    if (match?.priority === "high") {
      return false;
    }
  }

  const combined = `${contactName} ${preview}`.toLowerCase();

  if (IGNORE_PATTERNS.some((pattern) => pattern.test(combined))) {
    return true;
  }

  if (sourceApp) {
    const appKeywords = getAppIgnoreKeywords(sourceApp);
    if (appKeywords.some((keyword) => combined.includes(keyword))) {
      return true;
    }
  }

  return false;
}

export function classifyRequiresReply(
  likelyLastSender: InboxItem["likelyLastSender"],
  confidence: number,
): RequiresReply {
  if (likelyLastSender === "me") {
    return false;
  }

  if (likelyLastSender === "unknown" || confidence < CONFIDENCE_THRESHOLD) {
    return "review";
  }

  if (likelyLastSender === "them" && confidence >= CONFIDENCE_THRESHOLD) {
    return true;
  }

  return "review";
}

export function classifyItem(raw: RawModelItem): InboxItem {
  const requiresReply = classifyRequiresReply(
    raw.likelyLastSender,
    raw.confidence,
  );

  return {
    contactName: raw.contactName,
    preview: raw.preview,
    timestampText: raw.timestampText,
    likelyLastSender: raw.likelyLastSender,
    requiresReply,
    confidence: raw.confidence,
    reason: raw.reason,
  };
}

export function classifyAndFilterItems(
  rawItems: RawModelItem[],
  sourceApp: SourceApp,
  priorityContacts: PriorityContact[] = [],
): ClassifyOutcome {
  const items: InboxItem[] = [];
  const warnings: string[] = [];

  for (const raw of rawItems) {
    if (raw.app && raw.app !== sourceApp) {
      warnings.push(
        `Corrected app mismatch for "${raw.contactName}" (${raw.app} → ${sourceApp}).`,
      );
    }

    if (shouldIgnoreItem(raw.contactName, raw.preview, sourceApp, priorityContacts)) {
      warnings.push(`Filtered automated message: ${raw.contactName}`);
      continue;
    }

    items.push(classifyItem(raw));
  }

  return { items, warnings };
}
