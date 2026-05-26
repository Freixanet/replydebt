import { SOURCE_APP_LABELS, type DashboardData } from "@/lib/types";

import { RawModelDebugPanel } from "../RawModelDebugPanel";

interface ScansPanelProps {
  dashboard: DashboardData;
}

export function ScansPanel({ dashboard }: ScansPanelProps) {
  if (dashboard.recentScans.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted">
        No scans yet. Analyze a screenshot to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border border-y border-border">
        {dashboard.recentScans.map((scan) => (
          <li
            key={scan.id}
            className="flex h-14 items-center justify-between gap-4 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-text">
                {scan.screenshotFileName}
              </p>
              <p className="text-xs text-muted">
                {SOURCE_APP_LABELS[scan.app]} ·{" "}
                {new Date(scan.createdAt).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <RawModelDebugPanel rawModelOutput={dashboard.latestScanRawOutput ?? undefined} />
    </div>
  );
}
