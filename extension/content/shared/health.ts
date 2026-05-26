import {
  HEALTH_FAILURE_THRESHOLD,
  type DetectionState,
  type ExtensionStore,
  type ScanPayload,
  type SelectorTier,
  type SourceApp,
} from "../../storage/schema";

const MAX_FAILURE_LOG = 50;

function computeDetectionState(
  app: SourceApp,
  consecutiveFailures: number,
  itemsDetected: number,
  failed: boolean,
): DetectionState {
  const threshold = HEALTH_FAILURE_THRESHOLD[app];

  if (failed && itemsDetected === 0) {
    if (consecutiveFailures >= threshold) return "broken";
    return "unknown";
  }

  if (itemsDetected === 0 && consecutiveFailures > 0) {
    return consecutiveFailures >= threshold ? "broken" : "unknown";
  }

  return "ok";
}

export function updateHealthFromScan(
  store: ExtensionStore,
  payload: ScanPayload,
): ExtensionStore {
  const { app, result, scannedAt } = payload;
  const previous = store.health[app];
  const hadItems = result.items.length > 0;
  const selectorFailure = result.failed || result.tierUsed === "none";

  const consecutiveFailures =
    hadItems && !selectorFailure
      ? 0
      : previous.consecutiveFailures + (selectorFailure ? 1 : 0);

  const detectionState = computeDetectionState(
    app,
    consecutiveFailures,
    result.items.length,
    result.failed,
  );

  const nextHealth = {
    ...store.health,
    [app]: {
      lastSuccessfulScan: hadItems ? scannedAt : previous.lastSuccessfulScan,
      consecutiveFailures,
      selectorTierUsed: result.tierUsed,
      itemsDetectedLastScan: result.items.length,
      detectionState,
      lastFailureLoggedAt: selectorFailure
        ? scannedAt
        : previous.lastFailureLoggedAt,
    },
  };

  const selectorFailures = [...store.selectorFailures];
  if (selectorFailure) {
    selectorFailures.unshift({
      app,
      at: scannedAt,
      tierUsed: result.tierUsed,
    });
  }

  return {
    ...store,
    health: nextHealth,
    selectorFailures: selectorFailures.slice(0, MAX_FAILURE_LOG),
  };
}

export function tierRegressionWarning(
  app: SourceApp,
  store: ExtensionStore,
): string | null {
  const health = store.health[app];
  if (health.selectorTierUsed === "none") {
    return `${app} detection may be broken (no tier matched).`;
  }
  if (
    typeof health.selectorTierUsed === "number" &&
    health.selectorTierUsed >= 3 &&
    health.consecutiveFailures >= 1
  ) {
    return `${app} is using fragile tier ${health.selectorTierUsed} selectors.`;
  }
  return null;
}

export function isAppDetectionBroken(
  app: SourceApp,
  store: ExtensionStore,
): boolean {
  return store.health[app].detectionState === "broken";
}

export function shouldShowUnknownInsteadOfZero(
  store: ExtensionStore,
): boolean {
  return Object.values(store.health).some(
    (record) => record.detectionState === "broken" || record.detectionState === "unknown",
  );
}

export function compareTierRegression(
  previous: SelectorTier,
  current: SelectorTier,
): boolean {
  const rank = (tier: SelectorTier) =>
    tier === "none" ? 99 : typeof tier === "number" ? tier : 99;
  return rank(current) > rank(previous);
}
