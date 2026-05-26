import type { ItemAction, PendingItemRecord, SourceApp } from "../../storage/schema";

const APP_DOT: Record<SourceApp, string> = {
  whatsapp: "bg-app-whatsapp",
  telegram: "bg-app-telegram",
  instagram: "bg-app-instagram",
  messenger: "bg-app-messenger",
};

function confidenceClass(confidence: number): string {
  if (confidence < 0.5) return "bg-danger";
  if (confidence <= 0.7) return "bg-warning";
  return "bg-success";
}

interface ItemRowProps {
  item: PendingItemRecord;
  onAction: (itemId: string, action: ItemAction) => void;
  busy?: boolean;
}

export function ItemRow({ item, onAction, busy = false }: ItemRowProps) {
  return (
    <div className="group flex items-center gap-2 border-b border-border px-3 py-2 hover:bg-surface">
      <span className={`size-2 shrink-0 rounded-full ${APP_DOT[item.app]}`} />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text">
          {item.contactName}
        </div>
        <div className="truncate text-xs text-muted">{item.preview}</div>
      </div>

      <span
        className={`size-2 shrink-0 rounded-full ${confidenceClass(item.confidence)}`}
        title={`Confidence ${Math.round(item.confidence * 100)}%`}
      />

      <div className="flex shrink-0 gap-1 opacity-100">
        <button
          type="button"
          disabled={busy}
          className="rounded border border-border px-2 py-1 text-[11px] text-text hover:bg-surface"
          onClick={() => onAction(item.id, "done")}
        >
          Done
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded border border-border px-2 py-1 text-[11px] text-muted hover:bg-surface"
          onClick={() => onAction(item.id, "ignore_contact")}
        >
          Ignore
        </button>
      </div>
    </div>
  );
}
