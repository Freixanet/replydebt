import {
  TTL_MS,
  type DetectedConversation,
  type ExtensionStore,
  type PendingItemRecord,
  type ScanPayload,
  type SelectorTier,
  type SourceApp,
  itemKey,
} from "../../storage/schema";
import { classifyDetected, shouldIgnoreConversation } from "./classify";

function toPendingItem(
  app: SourceApp,
  conv: DetectedConversation & { requiresReply: ReturnType<typeof classifyDetected>["requiresReply"] },
  now: number,
  tierUsed: SelectorTier,
  previous?: PendingItemRecord,
): PendingItemRecord {
  const id = itemKey(app, conv.contactName);

  return {
    id,
    app,
    contactName: conv.contactName,
    preview: conv.preview,
    timestampText: conv.timestampText,
    likelyLastSender: conv.likelyLastSender,
    requiresReply: conv.requiresReply,
    confidence: conv.confidence,
    reason: conv.reason,
    status:
      conv.requiresReply === false
        ? "done"
        : conv.requiresReply === "review"
          ? "review"
          : "pending",
    lastSeenAt: now,
    firstDetectedAt: previous?.firstDetectedAt ?? now,
    selectorTierUsed: tierUsed,
  };
}

function expireStaleItems(
  items: PendingItemRecord[],
  now: number,
): PendingItemRecord[] {
  return items.filter((item) => {
    if (item.status === "done" || item.status === "ignored") {
      return now - item.lastSeenAt <= TTL_MS;
    }
    return now - item.lastSeenAt <= TTL_MS;
  });
}

export function mergeScanIntoStore(
  store: ExtensionStore,
  payload: ScanPayload,
): ExtensionStore {
  const { app, result, coverage, scannedAt } = payload;
  const now = scannedAt;
  const visibleKeys = new Set<string>();

  const otherAppItems = store.items.filter((item) => item.app !== app);
  const appItems = new Map(
    store.items.filter((item) => item.app === app).map((item) => [item.id, item]),
  );

  for (const raw of result.items) {
    if (shouldIgnoreConversation(raw.contactName, raw.preview)) continue;

    const classified = classifyDetected(raw);
    const id = itemKey(app, classified.contactName);
    visibleKeys.add(id);
    const previous = appItems.get(id);

    if (classified.likelyLastSender === "me") {
      if (previous && previous.status !== "done" && previous.status !== "ignored") {
        appItems.set(id, {
          ...previous,
          status: "done",
          likelyLastSender: "me",
          preview: classified.preview,
          timestampText: classified.timestampText,
          lastSeenAt: now,
          selectorTierUsed: result.tierUsed,
        });
      }
      continue;
    }

    if (previous?.status === "done" && classified.requiresReply === true) {
      appItems.set(
        id,
        toPendingItem(app, classified, now, result.tierUsed, previous),
      );
      continue;
    }

    if (previous?.status === "ignored") {
      continue;
    }

    appItems.set(id, toPendingItem(app, classified, now, result.tierUsed, previous));
  }

  for (const [id, item] of appItems) {
    if (visibleKeys.has(id)) continue;
    if (item.status === "pending" || item.status === "review") {
      // Keep scrolled-off conversations; do not delete.
      continue;
    }
  }

  const merged = expireStaleItems(
    [...otherAppItems, ...Array.from(appItems.values())],
    now,
  );

  return {
    ...store,
    items: merged,
    coverage: {
      ...store.coverage,
      [app]: coverage,
    },
  };
}
