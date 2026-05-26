"use client";

import { AnalysisAlerts } from "@/components/AnalysisAlerts";
import { ScreenshotUpload } from "@/components/ScreenshotUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GUIDED_SCAN_APPS } from "@/lib/guided-scan";
import {
  SOURCE_APP_LABELS,
  type DashboardData,
  type GuidedScanSession,
  type SourceApp,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const APP_CHIP_LABELS: Record<SourceApp, string> = {
  whatsapp: "WA",
  telegram: "TG",
  instagram: "IG",
  messenger: "FB",
  messages: "MSG",
};

interface GuidedScanSheetProps {
  open: boolean;
  session: GuidedScanSession | null;
  dashboard: DashboardData;
  screenshot: File | null;
  instructions: string;
  mockMode: boolean;
  loading: boolean;
  error: string | null;
  warnings?: string[];
  onScreenshotChange: (file: File | null) => void;
  showCapture?: boolean;
  captureLoading?: boolean;
  captureError?: string | null;
  onCapture?: () => void;
  onAnalyze: (event: React.FormEvent) => void;
  onSkip: () => void;
  onStop: () => void;
  onSelectApp: (app: SourceApp) => void;
  onViewPending: () => void;
}

function chipClass(app: SourceApp, session: GuidedScanSession): string {
  const state = session.appStates[app];
  const isCurrent = session.currentApp === app;

  if (isCurrent) {
    return "border-accent bg-surface text-text";
  }

  if (state === "scanned") {
    return "border-success/40 bg-surface text-success";
  }

  if (state === "skipped") {
    return "border-border bg-surface text-muted line-through";
  }

  return "border-border bg-surface text-muted";
}

export function GuidedScanSheet({
  open,
  session,
  dashboard,
  screenshot,
  instructions,
  mockMode,
  loading,
  error,
  warnings,
  onScreenshotChange,
  showCapture = false,
  captureLoading = false,
  captureError = null,
  onCapture,
  onAnalyze,
  onSkip,
  onStop,
  onSelectApp,
  onViewPending,
}: GuidedScanSheetProps) {
  if (!session) return null;

  const showSummary = session.isComplete;
  const canAnalyze = mockMode || !!screenshot;
  const progressPercent = Math.round(
    (session.completedCount / session.totalApps) * 100,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && !loading && onStop()}
    >
      <DialogContent
        className="max-h-[90vh] max-w-lg overflow-y-auto rounded-[var(--radius-card)] shadow-sm sm:max-w-lg"
        showCloseButton={!loading}
      >
        <DialogHeader>
          <DialogTitle>Guided scan</DialogTitle>
          <DialogDescription>
            {showSummary
              ? "All apps processed."
              : `${session.completedCount}/${session.totalApps} apps complete`}
          </DialogDescription>
        </DialogHeader>

        <div className="h-1 overflow-hidden rounded-[var(--radius)] bg-surface">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {GUIDED_SCAN_APPS.map((app) => (
            <Button
              key={app}
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => onSelectApp(app)}
              title={SOURCE_APP_LABELS[app]}
              className={cn("px-2", chipClass(app, session))}
            >
              {APP_CHIP_LABELS[app]}
            </Button>
          ))}
        </div>

        {showSummary ? (
          <div className="space-y-4">
            <div className="space-y-2 text-sm text-muted">
              <p>
                <span className="font-medium text-text">
                  {dashboard.pending.length}
                </span>{" "}
                pending
              </p>
              <p>
                <span className="font-medium text-text">
                  {dashboard.review.length}
                </span>{" "}
                need review
              </p>
              <p>
                {GUIDED_SCAN_APPS.filter(
                  (app) => session.appStates[app] === "scanned",
                ).length}{" "}
                scanned ·{" "}
                {GUIDED_SCAN_APPS.filter(
                  (app) => session.appStates[app] === "skipped",
                ).length}{" "}
                skipped
              </p>
            </div>
            <Button type="button" onClick={onViewPending} className="w-full">
              View pending list
            </Button>
          </div>
        ) : (
          <form onSubmit={onAnalyze} className="space-y-4">
            <div className="rounded-[var(--radius)] border border-border bg-surface px-3 py-2">
              <Badge variant="outline" className="text-xs">
                Step {session.currentAppIndex + 1} ·{" "}
                {SOURCE_APP_LABELS[session.currentApp]}
              </Badge>
              <p className="mt-2 text-sm text-text">{instructions}</p>
            </div>

            <ScreenshotUpload
              file={screenshot}
              onChange={onScreenshotChange}
              disabled={loading}
              optional={mockMode}
              showCapture={showCapture}
              captureLoading={captureLoading}
              captureError={captureError}
              onCapture={onCapture}
            />

            <AnalysisAlerts error={error} warnings={warnings} />

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                disabled={loading || !canAnalyze}
                className="flex-1"
              >
                {loading ? "Analyzing…" : "Analyze screenshot"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={onSkip}
              >
                Skip this app
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              disabled={loading}
              onClick={onStop}
              className="w-full text-muted"
            >
              Stop for now
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
