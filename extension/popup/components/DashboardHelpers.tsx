import {
  HEALTH_FAILURE_THRESHOLD,
  SOURCE_APP_LABELS,
  SOURCE_APPS,
  type ExtensionStore,
  type PendingItemRecord,
  type SourceApp,
} from "../../storage/schema";
import { isAppDetectionBroken, tierRegressionWarning } from "../../content/shared/health";

export function HealthBanner({ store }: { store: ExtensionStore }) {
  const warnings = SOURCE_APPS.flatMap((app) => {
    const health = store.health[app];
    const messages: string[] = [];

    if (isAppDetectionBroken(app, store)) {
      messages.push(
        `${SOURCE_APP_LABELS[app]} detection may be broken (${health.consecutiveFailures} failed scans).`,
      );
    }

    const regression = tierRegressionWarning(app, store);
    if (regression) messages.push(regression);

    return messages;
  });

  if (warnings.length === 0) return null;

  return (
    <div className="border-b border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
      {warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
      <a
        className="mt-1 inline-block text-accent underline"
        href="https://github.com/Freixanet/replydebt/issues"
        target="_blank"
        rel="noreferrer"
      >
        Report issue
      </a>
    </div>
  );
}

export function HealthSummary({ store }: { store: ExtensionStore }) {
  return (
    <div className="grid grid-cols-2 gap-2 px-3 py-2 text-[11px] text-muted">
      {SOURCE_APPS.map((app) => {
        const health = store.health[app];
        const threshold = HEALTH_FAILURE_THRESHOLD[app];
        return (
          <div
            key={app}
            className="rounded border border-border bg-surface px-2 py-1.5"
          >
            <div className="font-medium text-text">{SOURCE_APP_LABELS[app]}</div>
            <div>Tier {health.selectorTierUsed}</div>
            <div>
              State:{" "}
              <span
                className={
                  health.detectionState === "broken"
                    ? "text-danger"
                    : health.detectionState === "unknown"
                      ? "text-warning"
                      : "text-success"
                }
              >
                {health.detectionState}
              </span>
            </div>
            <div>
              Failures: {health.consecutiveFailures}/{threshold}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CoverageIndicator({
  store,
  activeApp,
}: {
  store: ExtensionStore;
  activeApp?: SourceApp;
}) {
  const entries = activeApp
    ? store.coverage[activeApp]
      ? [store.coverage[activeApp]!]
      : []
    : SOURCE_APPS.map((app) => store.coverage[app]).filter(
        (entry): entry is NonNullable<typeof entry> => Boolean(entry),
      );

  if (entries.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-muted">
        Open a supported inbox tab and scroll naturally to improve scan coverage.
      </p>
    );
  }

  return (
    <div className="space-y-1 border-b border-border px-3 py-2 text-xs text-muted">
      {entries.map((entry) => (
        <p key={entry.app}>
          {SOURCE_APP_LABELS[entry.app]}: scanned {entry.scannedVisible} of ~
          {entry.estimatedVisible} chats visible. Scroll through your inbox to
          improve coverage.
        </p>
      ))}
    </div>
  );
}

export function countVisiblePending(
  store: ExtensionStore,
  tab: "pending" | "review" | "done",
): number | "unknown" {
  const broken = SOURCE_APPS.some((app) => isAppDetectionBroken(app, store));
  if (broken && tab !== "done") return "unknown";

  return store.items.filter((item) => item.status === tab).length;
}

export function sortItems(items: PendingItemRecord[]): PendingItemRecord[] {
  return [...items].sort(
    (a, b) => b.lastSeenAt - a.lastSeenAt || b.confidence - a.confidence,
  );
}
