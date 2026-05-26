"use client";

import {
  Check,
  Clock,
  EyeOff,
  MoreVertical,
  RotateCcw,
} from "lucide-react";

import { AppDot } from "@/components/dashboard/AppDot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ItemAction, PendingItemRecord, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ItemRowProps {
  item: PendingItemRecord;
  onAction: (
    itemId: string,
    action: ItemAction,
    options?: { priority?: Priority },
  ) => void;
  actionLoading?: boolean;
  showRestore?: boolean;
  isSelected?: boolean;
}

function confidenceDotClass(confidence: number): string {
  if (confidence < 0.5) return "bg-danger";
  if (confidence <= 0.7) return "bg-warning";
  return "bg-success";
}

export function ItemRow({
  item,
  onAction,
  actionLoading = false,
  showRestore = false,
  isSelected = false,
}: ItemRowProps) {
  const isHighPriority = item.priority === "high";

  return (
    <div
      data-priority={isHighPriority ? "high" : undefined}
      className={cn(
        "group flex h-14 items-center gap-3 px-3 py-2.5",
        "hover:bg-surface",
        isHighPriority && "border-l-2 border-l-accent",
        isSelected && "bg-surface ring-1 ring-inset ring-border",
      )}
    >
      <AppDot app={item.app} />

      <span className="shrink-0 text-base font-medium text-text">
        {item.contactName}
      </span>

      {item.isOverdue && (
        <Badge
          variant="outline"
          className="shrink-0 border-danger/40 px-1.5 py-0 text-xs text-danger"
        >
          Overdue
        </Badge>
      )}

      <p className="min-w-0 flex-1 truncate text-sm text-muted">{item.preview}</p>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-1 group-hover:flex">
          {!showRestore && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={actionLoading}
                onClick={() => onAction(item.id, "done")}
                aria-label="Mark done"
              >
                <Check className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={actionLoading}
                onClick={() => onAction(item.id, "snooze_24h")}
                aria-label="Snooze 24 hours"
              >
                <Clock className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={actionLoading}
                onClick={() => onAction(item.id, "ignore_contact")}
                aria-label="Ignore contact"
              >
                <EyeOff className="size-4" />
              </Button>
            </>
          )}
          {showRestore && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={actionLoading}
              onClick={() => onAction(item.id, "restore_contact")}
              aria-label="Restore contact"
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
        </div>

        <time className="hidden text-xs text-muted sm:inline">
          {item.timestampText}
        </time>

        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            confidenceDotClass(item.confidence),
          )}
          title={`${Math.round(item.confidence * 100)}% confidence`}
          aria-label={`${Math.round(item.confidence * 100)}% confidence`}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={actionLoading}
              aria-label="More actions"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {!showRestore ? (
              <>
                <DropdownMenuItem onClick={() => onAction(item.id, "done")}>
                  Done
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction(item.id, "snooze_1h")}
                >
                  Snooze 1 hour
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction(item.id, "snooze_24h")}
                >
                  Snooze 24 hours
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction(item.id, "ignore_contact")}
                >
                  Ignore
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Priority</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {(["high", "medium", "low"] as Priority[]).map(
                      (priority) => (
                        <DropdownMenuItem
                          key={priority}
                          onClick={() =>
                            onAction(item.id, "set_priority", { priority })
                          }
                        >
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            ) : (
              <DropdownMenuItem
                onClick={() => onAction(item.id, "restore_contact")}
              >
                Restore
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
