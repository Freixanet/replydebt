"use client";

import { Button } from "@/components/ui/button";
import {
  SOURCE_APP_LABELS,
  SOURCE_APPS,
  type SourceApp,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface SourceAppPickerProps {
  value: SourceApp | null;
  onChange: (app: SourceApp) => void;
  disabled?: boolean;
}

export function SourceAppPicker({
  value,
  onChange,
  disabled = false,
}: SourceAppPickerProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm text-muted">Source app</legend>
      <div className="flex flex-wrap gap-2">
        {SOURCE_APPS.map((app) => {
          const selected = value === app;
          return (
            <Button
              key={app}
              type="button"
              variant={selected ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => onChange(app)}
              className={cn(!selected && "border-border bg-surface text-text")}
            >
              {SOURCE_APP_LABELS[app]}
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}
