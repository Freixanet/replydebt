import { Badge } from "@/components/ui/badge";
import type { PendingItemRecord } from "@/lib/types";

interface TopThreePanelProps {
  items: PendingItemRecord[];
}

export function TopThreePanel({ items }: TopThreePanelProps) {
  if (items.length === 0) return null;

  const overdueCount = items.filter((item) => item.isOverdue).length;
  const names = items.map((item) => item.contactName).join(", ");

  return (
    <p className="pb-3 text-sm text-muted">
      Clear today:{" "}
      <span className="text-text">{names}</span>
      {overdueCount > 0 && (
        <>
          {" "}
          <Badge
            variant="outline"
            className="ml-1 border-danger/40 text-xs text-danger"
          >
            {overdueCount} overdue
          </Badge>
        </>
      )}
    </p>
  );
}
