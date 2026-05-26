import type {
  DetectedConversation,
  LastSender,
  RequiresReply,
} from "../../storage/schema";

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

export function shouldIgnoreConversation(
  contactName: string,
  preview: string,
): boolean {
  const combined = `${contactName} ${preview}`.toLowerCase();
  return IGNORE_PATTERNS.some((pattern) => pattern.test(combined));
}

export function classifyRequiresReply(
  likelyLastSender: LastSender,
  confidence: number,
): RequiresReply {
  if (likelyLastSender === "me") return false;
  if (likelyLastSender === "unknown" || confidence < CONFIDENCE_THRESHOLD) {
    return "review";
  }
  if (likelyLastSender === "them" && confidence >= CONFIDENCE_THRESHOLD) {
    return true;
  }
  return "review";
}

export function classifyDetected(
  raw: DetectedConversation,
): DetectedConversation & { requiresReply: RequiresReply } {
  return {
    ...raw,
    requiresReply: classifyRequiresReply(raw.likelyLastSender, raw.confidence),
  };
}

export function inferSenderFromPreview(preview: string): LastSender {
  const trimmed = preview.trim();
  if (/^you sent\b/i.test(trimmed)) return "me";
  if (/^you:\s*/i.test(trimmed)) return "me";
  return "unknown";
}

export function stripYouPrefix(preview: string): string {
  return preview.replace(/^you sent[:\s-]*/i, "").replace(/^you:\s*/i, "").trim();
}

export function hasNumericBadge(element: Element): boolean {
  const text = element.textContent?.trim() ?? "";
  if (/^\d{1,3}$/.test(text)) return true;

  return Array.from(element.querySelectorAll("[aria-label], span")).some((node) => {
    const label = node.getAttribute("aria-label") ?? "";
    const value = node.textContent?.trim() ?? "";
    return /\bunread\b/i.test(label) || /^\d{1,3}$/.test(value);
  });
}

export function safeQuery<T>(
  fn: () => T,
  fallback: T,
): { value: T; error: unknown | null } {
  try {
    return { value: fn(), error: null };
  } catch (error) {
    return { value: fallback, error };
  }
}

export function textFromElement(element: Element | null): string {
  if (!element) return "";
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function firstText(elements: Element[]): string {
  for (const element of elements) {
    const text = textFromElement(element);
    if (text) return text;
  }
  return "";
}
