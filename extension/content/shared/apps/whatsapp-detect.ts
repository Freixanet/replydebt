import type { DetectedConversation } from "../../../storage/schema";
import {
  hasNumericBadge,
  inferSenderFromPreview,
  safeQuery,
  stripYouPrefix,
  textFromElement,
} from "../classify";
import { dedupeConversations, runTieredDetection } from "../detector";
import {
  findFiberProp,
  pickNestedString,
  pickString,
  walkFiberTree,
} from "../react-fiber";

function tier1WhatsApp(): DetectedConversation[] {
  const rows = Array.from(
    document.querySelectorAll('[data-testid="cell-frame-container"]'),
  );

  return rows.flatMap((row) => {
      const title =
        row.querySelector("[data-testid='conversation-info-header']") ??
        row.querySelector("[aria-label][title]") ??
        row.querySelector("[aria-label]");

      const previewNode =
        row.querySelector("[data-testid='last-msg-text']") ??
        row.querySelector("[dir='ltr'] span[title]") ??
        row.querySelector("span[title]");

      const timeNode =
        row.querySelector("[data-testid='msg-time']") ??
        row.querySelector("time");

      const contactName = textFromElement(title);
      const preview = textFromElement(previewNode);
      if (!contactName || !preview) return [];

      const statusIcon = row.querySelector(
        "[data-testid='last-msg-status'], [data-testid='msg-check'], [data-icon='msg-check'], [data-icon='msg-dblcheck']",
      );
      const unread = row.querySelector("[data-testid='unread-count']");

      let likelyLastSender: DetectedConversation["likelyLastSender"] = "unknown";
      let confidence = 0.55;
      let reason = "WhatsApp tier-1 row without clear sender signal.";

      if (statusIcon) {
        likelyLastSender = "me";
        confidence = 0.9;
        reason = "WhatsApp message status icon indicates last sender is me.";
      } else if (unread || hasNumericBadge(row)) {
        likelyLastSender = "them";
        confidence = 0.88;
        reason = "WhatsApp unread badge indicates incoming last message.";
      }

      return [{
        contactName,
        preview,
        timestampText: textFromElement(timeNode) || "—",
        likelyLastSender,
        confidence,
        reason,
        isUnread: Boolean(unread),
      } satisfies DetectedConversation];
    });
}

function tier2WhatsApp(): DetectedConversation[] {
  const listRoot =
    document.querySelector('[data-testid="chat-list"]') ??
    document.querySelector('[role="grid"]') ??
    document.body;

  const results: DetectedConversation[] = [];

  walkFiberTree(listRoot, (props) => {
    const contactName =
      pickNestedString(props, ["title", "name", "formattedTitle", "pushname"]) ??
      pickString(props["aria-label"]);
    const preview =
      pickNestedString(props, ["body", "lastMessage", "preview", "subtitle"]) ??
      pickString(props["children"] as unknown);

    if (!contactName || !preview || contactName.length > 80) return;

    const sender = inferSenderFromPreview(preview);
    results.push({
      contactName,
      preview: stripYouPrefix(preview),
      timestampText: pickNestedString(props, ["timestamp", "time"]) ?? "—",
      likelyLastSender: sender === "unknown" ? "them" : sender,
      confidence: sender === "me" ? 0.86 : 0.72,
      reason: "WhatsApp React Fiber conversation props.",
    });
  });

  return dedupeConversations(results);
}

function tier3WhatsApp(): DetectedConversation[] {
  const rows = Array.from(document.querySelectorAll('[role="listitem"], [role="row"]'));

  return rows.flatMap((row) => {
      const aria = row.getAttribute("aria-label") ?? "";
      const parts = aria.split(",").map((part) => part.trim()).filter(Boolean);
      const contactName = parts[0] ?? "";
      const preview =
        textFromElement(row.querySelector("span[title], span[dir='ltr']")) || parts[1] || "";
      if (!contactName || !preview) return [];

      const sender = inferSenderFromPreview(preview);
      return [{
        contactName,
        preview: stripYouPrefix(preview),
        timestampText: parts[2] ?? "—",
        likelyLastSender: sender,
        confidence: 0.6,
        reason: "WhatsApp structural aria-label row fallback.",
      } satisfies DetectedConversation];
    });
}

function tier4WhatsApp(): DetectedConversation[] {
  const rows = Array.from(document.querySelectorAll('[role="listitem"], [role="row"]'));

  return rows.flatMap((row) => {
      const text = textFromElement(row);
      if (!text || text.length < 4) return [];

      const sender = inferSenderFromPreview(text);
      const unread = hasNumericBadge(row);

      return [{
        contactName: text.slice(0, 40),
        preview: stripYouPrefix(text),
        timestampText: "—",
        likelyLastSender: sender !== "unknown" ? sender : unread ? "them" : "unknown",
        confidence: unread ? 0.65 : 0.5,
        reason: "WhatsApp text heuristics fallback.",
        isUnread: unread,
      } satisfies DetectedConversation];
    });
}

function countVisibleRows(): number {
  return document.querySelectorAll(
    '[data-testid="cell-frame-container"], [role="listitem"], [role="row"]',
  ).length;
}

export function detectWhatsAppConversations() {
  return safeQuery(
    () =>
      runTieredDetection(
        {
          tier1: tier1WhatsApp,
          tier2: () => {
            const listRoot =
              document.querySelector('[data-testid="chat-list"]') ??
              document.querySelector('[role="grid"]');
            if (!listRoot) return [];
            findFiberProp(listRoot, () => true);
            return tier2WhatsApp();
          },
          tier3: tier3WhatsApp,
          tier4: tier4WhatsApp,
        },
        countVisibleRows,
      ),
    {
      items: [],
      tierUsed: "none" as const,
      visibleCount: 0,
      failed: true,
    },
  ).value;
}
