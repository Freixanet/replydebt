import type { DetectedConversation } from "../../../storage/schema";
import {
  hasNumericBadge,
  inferSenderFromPreview,
  stripYouPrefix,
  textFromElement,
} from "../classify";
import { dedupeConversations, runTieredDetection } from "../detector";
import { pickNestedString, walkFiberTree } from "../react-fiber";

function isMarketplaceThread(row: Element): boolean {
  const href = row.querySelector("a[href]")?.getAttribute("href") ?? "";
  return /marketplace|commerce|buy/i.test(href);
}

function tier1Messenger(): DetectedConversation[] {
  const rows = Array.from(
    document.querySelectorAll('[role="row"], [role="listitem"], [data-testid]'),
  );

  return rows.flatMap((row) => {
      if (isMarketplaceThread(row)) return [];

      const contactName =
        textFromElement(row.querySelector("[aria-label], [title], h2, h3")) ||
        row.getAttribute("aria-label")?.split(",")[0]?.trim() ||
        "";

      const preview = textFromElement(
        row.querySelector("span[dir='auto'], span:not(:empty)"),
      );
      if (!contactName || !preview) return [];

      const sender = inferSenderFromPreview(preview);
      const unread = hasNumericBadge(row);

      return [{
        contactName,
        preview: stripYouPrefix(preview),
        timestampText: "—",
        likelyLastSender:
          sender !== "unknown" ? sender : unread ? "them" : "unknown",
        confidence: unread ? 0.82 : sender === "me" ? 0.84 : 0.66,
        reason: "Messenger ARIA row metadata.",
        isUnread: unread,
      } satisfies DetectedConversation];
    });
}

function tier2Messenger(): DetectedConversation[] {
  const root = document.querySelector('[role="main"]') ?? document.body;
  const results: DetectedConversation[] = [];

  walkFiberTree(root, (props) => {
    const contactName = pickNestedString(props, [
      "name",
      "title",
      "threadName",
      "participantName",
    ]);
    const preview = pickNestedString(props, [
      "snippet",
      "preview",
      "message",
      "body",
    ]);
    if (!contactName || !preview) return;

    const sender = inferSenderFromPreview(preview);
    results.push({
      contactName,
      preview: stripYouPrefix(preview),
      timestampText: "—",
      likelyLastSender: sender,
      confidence: sender === "me" ? 0.86 : 0.74,
      reason: "Messenger React Fiber thread props.",
    });
  });

  return dedupeConversations(results);
}

function tier3Messenger(): DetectedConversation[] {
  const rows = Array.from(document.querySelectorAll('[role="row"]'));
  return rows.flatMap((row, index) => {
      const text = textFromElement(row);
      if (!text) return [];
      const sender = inferSenderFromPreview(text);
      return [{
        contactName: `Thread ${index + 1}`,
        preview: stripYouPrefix(text),
        timestampText: "—",
        likelyLastSender: sender,
        confidence: 0.55,
        reason: "Messenger positional row fallback.",
      } satisfies DetectedConversation];
    });
}

function tier4Messenger(): DetectedConversation[] {
  return tier1Messenger().map((item) => ({
    ...item,
    confidence: Math.min(item.confidence, 0.58),
    reason: "Messenger text heuristics fallback.",
  }));
}

export function detectMessengerConversations() {
  if (/marketplace/i.test(window.location.pathname)) {
    return {
      items: [],
      tierUsed: "none" as const,
      visibleCount: 0,
      failed: false,
    };
  }

  return runTieredDetection(
    {
      tier1: tier1Messenger,
      tier2: tier2Messenger,
      tier3: tier3Messenger,
      tier4: tier4Messenger,
    },
    () => document.querySelectorAll('[role="row"], [role="listitem"]').length,
  );
}
