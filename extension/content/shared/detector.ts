import type {
  DetectedConversation,
  DetectionResult,
  SelectorTier,
} from "../../storage/schema";

export type TierDetector = () => DetectedConversation[];

export interface TieredDetectorConfig {
  tier1?: TierDetector;
  tier2?: TierDetector;
  tier3?: TierDetector;
  tier4?: TierDetector;
}

export function runTieredDetection(
  config: TieredDetectorConfig,
  visibleCounter?: () => number,
): DetectionResult {
  const tiers: Array<{ tier: SelectorTier; run?: TierDetector }> = [
    { tier: 1, run: config.tier1 },
    { tier: 2, run: config.tier2 },
    { tier: 3, run: config.tier3 },
    { tier: 4, run: config.tier4 },
  ];

  for (const entry of tiers) {
    if (!entry.run) continue;

    try {
      const items = entry.run();
      if (items.length > 0) {
        return {
          items,
          tierUsed: entry.tier,
          visibleCount: visibleCounter?.() ?? items.length,
          failed: false,
        };
      }
    } catch {
      // Fall through to next tier.
    }
  }

  let tier4Items: DetectedConversation[] = [];
  if (config.tier4) {
    try {
      tier4Items = config.tier4();
    } catch {
      tier4Items = [];
    }
  }

  const visibleCount = visibleCounter?.() ?? tier4Items.length;

  return {
    items: tier4Items,
    tierUsed: tier4Items.length > 0 ? 4 : "none",
    visibleCount,
    failed: tier4Items.length === 0 && visibleCount === 0,
  };
}

export function dedupeConversations(
  items: DetectedConversation[],
): DetectedConversation[] {
  const map = new Map<string, DetectedConversation>();

  for (const item of items) {
    const key = item.contactName.trim().toLowerCase();
    if (!key) continue;
    map.set(key, item);
  }

  return Array.from(map.values());
}
