import type { DetectedConversation } from "../../../storage/schema";
import {
  inferSenderFromPreview,
  stripYouPrefix,
  textFromElement,
} from "../classify";
import { dedupeConversations, runTieredDetection } from "../detector";
import { pickNestedString, walkFiberTree } from "../react-fiber";

function isDirectInbox(): boolean {
  return /\/direct\/?(inbox)?\/?$/i.test(window.location.pathname);
}

function tier2Instagram(): DetectedConversation[] {
  const root =
    document.querySelector('[role="main"]') ??
    document.querySelector("main") ??
    document.body;

  const results: DetectedConversation[] = [];

  walkFiberTree(root, (props) => {
    const contactName = pickNestedString(props, [
      "title",
      "username",
      "threadTitle",
      "name",
    ]);
    const preview = pickNestedString(props, [
      "preview",
      "snippet",
      "text",
      "message",
    ]);
    if (!contactName || !preview) return;

    const sender = inferSenderFromPreview(preview);
    const boldTitle = Boolean(
      (props["className"] as string | undefined)?.includes("bold") ||
        (props["fontWeight"] as number | undefined) === 600,
    );

    results.push({
      contactName,
      preview: stripYouPrefix(preview),
      timestampText: "—",
      likelyLastSender:
        sender !== "unknown" ? sender : boldTitle ? "them" : "unknown",
      confidence: sender === "me" ? 0.82 : boldTitle ? 0.7 : 0.55,
      reason: "Instagram React Fiber DM thread props.",
    });
  });

  return dedupeConversations(results);
}

function tier3Instagram(): DetectedConversation[] {
  const rows = Array.from(
    document.querySelectorAll('[role="listitem"], [role="row"], a[href*="/direct/"]'),
  );

  return rows.flatMap((row) => {
      const contactName =
        row.getAttribute("aria-label")?.split(",")[0]?.trim() ??
        textFromElement(row.querySelector("[title], span"));
      const preview = textFromElement(row.querySelector("span"));
      if (!contactName || !preview) return [];

      const sender = inferSenderFromPreview(preview);
      const fontWeight = window.getComputedStyle(row).fontWeight;
      const boldTitle = fontWeight === "700" || fontWeight === "600";

      return [{
        contactName,
        preview: stripYouPrefix(preview),
        timestampText: "—",
        likelyLastSender:
          sender !== "unknown" ? sender : boldTitle ? "them" : "unknown",
        confidence: boldTitle ? 0.66 : 0.52,
        reason: "Instagram structural DM row fallback.",
      } satisfies DetectedConversation];
    });
}

function tier4Instagram(): DetectedConversation[] {
  return tier3Instagram().map((item) => ({
    ...item,
    confidence: Math.min(item.confidence, 0.5),
    reason: "Instagram text heuristics fallback.",
  }));
}

export function detectInstagramConversations() {
  if (!isDirectInbox()) {
    return {
      items: [],
      tierUsed: "none" as const,
      visibleCount: 0,
      failed: false,
    };
  }

  return runTieredDetection(
    {
      tier2: tier2Instagram,
      tier3: tier3Instagram,
      tier4: tier4Instagram,
    },
    () =>
      document.querySelectorAll('[role="listitem"], [role="row"], a[href*="/direct/"]')
        .length,
  );
}
