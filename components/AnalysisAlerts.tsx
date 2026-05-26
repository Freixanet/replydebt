import { Badge } from "@/components/ui/badge";

interface AnalysisAlertsProps {
  error?: string | null;
  warnings?: string[];
}

const MAX_WARNINGS = 5;

export function AnalysisAlerts({ error, warnings = [] }: AnalysisAlertsProps) {
  const visibleWarnings = warnings.slice(0, MAX_WARNINGS);
  const hiddenCount = warnings.length - visibleWarnings.length;

  return (
    <div className="space-y-2">
      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline" className="border-danger/40 text-danger">
            Error
          </Badge>
          <span className="text-text">{error}</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="text-sm text-muted">
          <Badge variant="outline" className="mr-2 border-warning/40 text-warning">
            Warnings
          </Badge>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {visibleWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          {hiddenCount > 0 && (
            <p className="mt-1 text-xs">
              and {hiddenCount} more warning{hiddenCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
