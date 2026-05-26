"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

interface ScreenshotUploadProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  optional?: boolean;
  showCapture?: boolean;
  captureLoading?: boolean;
  onCapture?: () => void;
  captureError?: string | null;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function ScreenshotUpload({
  file,
  onChange,
  disabled = false,
  optional = false,
  showCapture = false,
  captureLoading = false,
  onCapture,
  captureError = null,
}: ScreenshotUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(selected: File | null) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!selected) {
      setPreviewUrl(null);
      onChange(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      return;
    }

    setPreviewUrl(URL.createObjectURL(selected));
    onChange(selected);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (disabled) return;

    const dropped = event.dataTransfer.files[0];
    if (dropped) {
      handleFile(dropped);
    }
  }

  const isBusy = disabled || captureLoading;

  return (
    <div className="space-y-2">
      <label className="text-sm text-muted">
        Screenshot{optional ? " (optional)" : ""}
      </label>

      {showCapture && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy || !onCapture}
            onClick={onCapture}
            className="w-full"
          >
            {captureLoading ? "Capturing…" : "Capture Current Screen"}
          </Button>
          <p className="text-xs text-muted">
            Switch to your inbox app, then click Capture. Only the main display
            is captured.
          </p>
          {captureError && (
            <p className="text-xs text-danger">{captureError}</p>
          )}
        </div>
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!isBusy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isBusy && inputRef.current?.click()}
        className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[var(--radius)] border border-dashed px-4 py-6 transition-colors ${
          dragOver
            ? "border-accent bg-surface"
            : "border-border bg-surface hover:border-muted"
        } ${isBusy ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Screenshot preview"
            className="max-h-48 max-w-full rounded-[var(--radius)] object-contain"
          />
        ) : (
          <div className="text-center">
            <p className="text-base text-text">Drop screenshot or click to browse</p>
            <p className="mt-1 text-xs text-muted">PNG, JPG, WEBP</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={isBusy}
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />
      </div>
      {file && (
        <p className="text-xs text-muted">
          {file.name} · {Math.round(file.size / 1024)} KB
        </p>
      )}
    </div>
  );
}
