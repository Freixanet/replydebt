import { useCallback, useEffect, useMemo, useState } from "react";

import { MESSAGE } from "../content/shared/runtime";
import { getDashboardBuckets } from "../storage/store";
import type { ExtensionStore, ItemAction } from "../storage/schema";

import {
  CoverageIndicator,
  countVisiblePending,
  HealthBanner,
  HealthSummary,
  sortItems,
} from "./components/DashboardHelpers";
import { ItemRow } from "./components/ItemRow";

type Tab = "pending" | "review" | "done";

async function fetchStore(): Promise<ExtensionStore> {
  const response = await chrome.runtime.sendMessage({ type: MESSAGE.GET_STORE });
  return response.store as ExtensionStore;
}

export function App() {
  const [store, setStore] = useState<ExtensionStore | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStore(await fetchStore());
      setError(null);
    } catch {
      setError("Could not load local ReplyDebt state.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const listener = () => void refresh();
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [refresh]);

  const buckets = useMemo(
    () => (store ? getDashboardBuckets(store) : null),
    [store],
  );

  const visibleItems = useMemo(() => {
    if (!buckets) return [];
    if (tab === "pending") return sortItems(buckets.pending);
    if (tab === "review") return sortItems(buckets.review);
    return sortItems(buckets.done);
  }, [buckets, tab]);

  async function handleAction(itemId: string, action: ItemAction) {
    setBusy(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE.ITEM_ACTION,
        itemId,
        action,
      });
      setStore(response.store as ExtensionStore);
    } finally {
      setBusy(false);
    }
  }

  async function handleClearData() {
    await chrome.runtime.sendMessage({ type: MESSAGE.CLEAR_DATA });
    await refresh();
  }

  const pendingCount = store ? countVisiblePending(store, "pending") : 0;

  return (
    <div className="flex min-h-[420px] flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <h1 className="text-sm font-semibold text-text">ReplyDebt</h1>
          <p className="text-[11px] text-muted">Local inbox debt tracker</p>
        </div>
        <button
          type="button"
          className="rounded border border-border px-2 py-1 text-[11px] text-muted"
          onClick={() => void handleClearData()}
        >
          Clear data
        </button>
      </header>

      {store && <HealthBanner store={store} />}
      {store && <CoverageIndicator store={store} />}

      <div className="flex border-b border-border px-2">
        {(["pending", "review", "done"] as Tab[]).map((value) => {
          const count =
            value === "pending"
              ? pendingCount
              : store
                ? countVisiblePending(store, value)
                : 0;

          return (
            <button
              key={value}
              type="button"
              className={`flex-1 border-b-2 px-2 py-2 text-xs capitalize ${
                tab === value
                  ? "border-accent text-text"
                  : "border-transparent text-muted"
              }`}
              onClick={() => setTab(value)}
            >
              {value}{" "}
              {count === "unknown" ? "?" : `(${count})`}
            </button>
          );
        })}
      </div>

      {error && <p className="px-3 py-2 text-xs text-danger">{error}</p>}

      {!store && !error && (
        <p className="px-3 py-6 text-sm text-muted">Loading local state…</p>
      )}

      {store && pendingCount === "unknown" && tab !== "done" && (
        <p className="px-3 py-2 text-xs text-warning">
          Detection status unknown for one or more apps. Pending count may be
          incomplete.
        </p>
      )}

      <div className="flex-1 overflow-y-auto">
        {visibleItems.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted">
            {tab === "pending"
              ? pendingCount === "unknown"
                ? "Scan status unknown. Open WhatsApp/Telegram/etc. and scroll your inbox."
                : "No pending replies detected in visible chats."
              : `No ${tab} items yet.`}
          </p>
        ) : (
          visibleItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              busy={busy}
              onAction={(itemId, action) => void handleAction(itemId, action)}
            />
          ))
        )}
      </div>

      {store && <HealthSummary store={store} />}
    </div>
  );
}
