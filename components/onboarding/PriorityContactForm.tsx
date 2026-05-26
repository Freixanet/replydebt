"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  REPLY_WINDOW_OPTIONS,
  SOURCE_APPS,
  SOURCE_APP_LABELS,
  type Priority,
  type ReplyWindow,
  type SourceApp,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export interface PriorityContactDraft {
  name: string;
  apps: SourceApp[];
  priority: Priority;
  replyWindow: ReplyWindow;
  notes: string;
}

export const EMPTY_PRIORITY_CONTACT_DRAFT: PriorityContactDraft = {
  name: "",
  apps: [],
  priority: "medium",
  replyWindow: "24h",
  notes: "",
};

interface PriorityContactFormProps {
  value: PriorityContactDraft;
  onChange: (value: PriorityContactDraft) => void;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
}

const inputClass =
  "mt-1 w-full rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted";

export function PriorityContactForm({
  value,
  onChange,
  onSubmit,
  submitLabel = "Add contact",
  disabled = false,
}: PriorityContactFormProps) {
  function toggleApp(app: SourceApp) {
    const apps = value.apps.includes(app)
      ? value.apps.filter((entry) => entry !== app)
      : [...value.apps, app];
    onChange({ ...value, apps });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!value.name.trim()) return;
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-muted">Name</label>
        <input
          type="text"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          disabled={disabled}
          placeholder="Alex, Mom, Design team…"
          className={inputClass}
        />
      </div>

      <div>
        <p className="text-sm text-muted">Apps</p>
        <p className="mt-1 text-xs text-muted">Leave empty to match on any app.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SOURCE_APPS.map((app) => {
            const selected = value.apps.includes(app);
            return (
              <Button
                key={app}
                type="button"
                variant={selected ? "default" : "outline"}
                size="sm"
                disabled={disabled}
                onClick={() => toggleApp(app)}
                className={cn(!selected && "border-border bg-surface text-text")}
              >
                {SOURCE_APP_LABELS[app]}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-muted">Priority</label>
          <select
            value={value.priority}
            onChange={(event) =>
              onChange({
                ...value,
                priority: event.target.value as Priority,
              })
            }
            disabled={disabled}
            className={inputClass}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-muted">Expected reply window</label>
          <select
            value={value.replyWindow}
            onChange={(event) =>
              onChange({
                ...value,
                replyWindow: event.target.value as ReplyWindow,
              })
            }
            disabled={disabled}
            className={inputClass}
          >
            {REPLY_WINDOW_OPTIONS.map((window) => (
              <option key={window} value={window}>
                {window}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-muted">Notes</label>
        <textarea
          value={value.notes}
          onChange={(event) => onChange({ ...value, notes: event.target.value })}
          disabled={disabled}
          rows={2}
          placeholder="Optional context"
          className={inputClass}
        />
      </div>

      <Separator />

      <Button type="submit" variant="outline" disabled={disabled || !value.name.trim()} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
