"use client";

interface RawModelDebugPanelProps {
  rawModelOutput?: string;
}

function formatRawOutput(rawModelOutput: string): string {
  try {
    return JSON.stringify(JSON.parse(rawModelOutput), null, 2);
  } catch {
    return rawModelOutput;
  }
}

export function RawModelDebugPanel({ rawModelOutput }: RawModelDebugPanelProps) {
  if (!rawModelOutput) {
    return null;
  }

  return (
    <details className="rounded-[var(--radius)] border border-border bg-surface">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted">
        Raw model output
      </summary>
      <pre className="max-h-64 overflow-auto border-t border-border px-3 py-2 text-xs text-text">
        {formatRawOutput(rawModelOutput)}
      </pre>
    </details>
  );
}
