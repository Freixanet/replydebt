import type { ItemAction, PendingItemRecord, Priority } from "@/lib/types";

import { ItemRow } from "./ItemRow";

interface ItemListProps {
  items: PendingItemRecord[];
  emptyMessage: string;
  onItemAction: (
    itemId: string,
    action: ItemAction,
    options?: { priority?: Priority },
  ) => void;
  actionLoadingId?: string | null;
  showRestore?: boolean;
  selectedIndex?: number;
}

export function ItemList({
  items,
  emptyMessage,
  onItemAction,
  actionLoadingId,
  showRestore = false,
  selectedIndex = -1,
}: ItemListProps) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item, index) => (
        <ItemRow
          key={item.id}
          item={item}
          onAction={onItemAction}
          actionLoading={actionLoadingId === item.id}
          showRestore={showRestore}
          isSelected={index === selectedIndex}
        />
      ))}
    </div>
  );
}
