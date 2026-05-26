"use client";

import { useState } from "react";

import { AnalysisAlerts } from "@/components/AnalysisAlerts";
import { RawModelDebugPanel } from "@/components/RawModelDebugPanel";
import { ScreenshotUpload } from "@/components/ScreenshotUpload";
import { SourceAppPicker } from "@/components/SourceAppPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SourceApp } from "@/lib/types";

interface DevConfig {
  analyzeMode: "live" | "mock";
  devJsonImport: boolean;
}

interface UploadSheetProps {
  open: boolean;
  sourceApp: SourceApp | null;
  screenshot: File | null;
  pastedJson: string;
  devConfig: DevConfig | null;
  loading: boolean;
  error: string | null;
  warnings?: string[];
  rawModelOutput?: string;
  onSourceAppChange: (app: SourceApp) => void;
  onScreenshotChange: (file: File | null) => void;
  onPastedJsonChange: (value: string) => void;
  showCapture?: boolean;
  captureLoading?: boolean;
  captureError?: string | null;
  onCapture?: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}

export function UploadSheet({
  open,
  sourceApp,
  screenshot,
  pastedJson,
  devConfig,
  loading,
  error,
  warnings,
  rawModelOutput,
  onSourceAppChange,
  onScreenshotChange,
  onPastedJsonChange,
  showCapture = false,
  captureLoading = false,
  captureError = null,
  onCapture,
  onSubmit,
  onClose,
}: UploadSheetProps) {
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const isDevelopment = process.env.NODE_ENV === "development";
  const mockMode = devConfig?.analyzeMode === "mock";
  const jsonImportEnabled = devConfig?.devJsonImport === true;
  const hasPastedJson = pastedJson.trim().length > 0;
  const canSubmit =
    !!sourceApp &&
    (mockMode || !!screenshot || (jsonImportEnabled && hasPastedJson));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !loading && !captureLoading && onClose()}>
      <DialogContent
        className="max-h-[90vh] max-w-lg overflow-y-auto rounded-[var(--radius-card)] shadow-sm sm:max-w-lg"
        showCloseButton={!loading && !captureLoading}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Analyze inbox</DialogTitle>
            {mockMode && (
              <Badge variant="outline" className="border-warning/40 text-warning">
                Mock
              </Badge>
            )}
          </div>
          <DialogDescription>
            {mockMode
              ? "Using sample data — no Google API key required."
              : "Upload a conversation list screenshot."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <SourceAppPicker
            value={sourceApp}
            onChange={onSourceAppChange}
            disabled={loading}
          />
          <ScreenshotUpload
            file={screenshot}
            onChange={onScreenshotChange}
            disabled={loading}
            optional={mockMode || (jsonImportEnabled && hasPastedJson)}
            showCapture={showCapture}
            captureLoading={captureLoading}
            captureError={captureError}
            onCapture={onCapture}
          />
          {isDevelopment && jsonImportEnabled && (
            <div className="rounded-[var(--radius)] border border-dashed border-border">
              <button
                type="button"
                onClick={() => setDevPanelOpen((value) => !value)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-text hover:bg-surface"
              >
                Paste model JSON (dev)
                <span className="text-xs text-muted">
                  {devPanelOpen ? "Hide" : "Show"}
                </span>
              </button>
              {devPanelOpen && (
                <div className="space-y-2 border-t border-border px-3 py-3">
                  <p className="text-xs text-muted">
                    Paste JSON from Cursor chat. Screenshot optional when JSON
                    is provided.
                  </p>
                  <textarea
                    value={pastedJson}
                    onChange={(event) => onPastedJsonChange(event.target.value)}
                    disabled={loading}
                    rows={6}
                    placeholder='{"items":[{"contactName":"…","preview":"…"}]}'
                    className="w-full rounded-[var(--radius)] border border-border bg-bg px-3 py-2 font-mono text-xs text-text placeholder:text-muted"
                  />
                </div>
              )}
            </div>
          )}
          <AnalysisAlerts error={error} warnings={warnings} />
          <RawModelDebugPanel rawModelOutput={rawModelOutput} />
          <Button type="submit" disabled={loading || !canSubmit} className="w-full">
            {loading ? "Analyzing…" : "Analyze inbox"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
