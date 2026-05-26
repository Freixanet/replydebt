import type { DetectedConversation } from "../../../storage/schema";
import {
  hasNumericBadge,
  inferSenderFromPreview,
  stripYouPrefix,
  textFromElement,
} from "../classify";
import { dedupeConversations, runTieredDetection } from "../detector";
import { pickNestedString, walkFiberTree } from "../react-fiber";

function tier1Telegram(): DetectedConversation[] {
  const rows = Array.from(
    document.querySelectorAll('[role="listitem"], a[href*="#"], [data-peer-id]'),
  );

  return rows.flatMap((row) => {
      const title =
        row.querySelector("[title]") ??
        row.querySelector("[aria-label]") ??
        row.querySelector("span");

      const previewNode =
        row.querySelector("span[dir='auto']:last-of-type") ??
        row.querySelector("span[dir='auto']");

      const contactName = textFromElement(title);
      const preview = textFromElement(previewNode);
      if (!contactName || !preview || contactName === preview) return [];

      const sender = inferSenderFromPreview(preview);
      const unread = hasNumericBadge(row);

      return [{
        contactName,
        preview: stripYouPrefix(preview),
        timestampText: "—",
        likelyLastSender:
          sender !== "unknown" ? sender : unread ? "them" : "unknown",
        confidence: unread ? 0.84 : sender === "me" ? 0.86 : 0.68,
        reason: "Telegram semantic listitem/title structure.",
        isUnread: unread,
      } satisfies DetectedConversation];
    });
}

function tier2Telegram(): DetectedConversation[] {
  const root =
    document.querySelector('[role="list"]') ??
    document.querySelector("main") ??
    document.body;
  const results: DetectedConversation[] = [];

  walkFiberTree(root, (props) => {
    const contactName = pickNestedString(props, [
      "title",
      "name",
      "firstName",
      "username",
    ]);
    const preview = pickNestedString(props, ["message", "lastMessage", "text"]);
    if (!contactName || !preview) return;

    const sender = inferSenderFromPreview(preview);
    results.push({
      contactName,
      preview: stripYouPrefix(preview),
      timestampText: "—",
      likelyLastSender: sender,
      confidence: sender === "me" ? 0.85 : 0.75,
      reason: "Telegram React Fiber props.",
    });
  });

  return dedupeConversations(results);
}

function tier3Telegram(): DetectedConversation[] {
  const rows = Array.from(document.querySelectorAll("a[href*='#']"));

  return rows.flatMap((row) => {
      const contactName =
        row.getAttribute("aria-label") ?? textFromElement(row.querySelector("[title]"));
      const preview = textFromElement(row.querySelector("span[dir='auto']"));
      if (!contactName || !preview) return [];

      const sender = inferSenderFromPreview(preview);
      return [{
        contactName,
        preview: stripYouPrefix(preview),
        timestampText: "—",
        likelyLastSender: sender,
        confidence: 0.62,
        reason: "Telegram anchor row fallback.",
      } satisfies DetectedConversation];
    });
}

function tier4Telegram(): DetectedConversation[] {
  return tier1Telegram().map((item) => ({
    ...item,
    confidence: Math.min(item.confidence, 0.58),
    reason: "Telegram text heuristics fallback.",
  }));
}

export function detectTelegramConversations() {
  return runTieredDetection(
    {
      tier1: tier1Telegram,
      tier2: tier2Telegram,
      tier3: tier3Telegram,
      tier4: tier4Telegram,
    },
    () => document.querySelectorAll('[role="listitem"], a[href*="#"]').length,
  );
}
