import {
  createEmptyStore,
  type ExtensionStore,
  type ItemAction,
  type PendingItemRecord,
  type ScanPayload,
  type SourceApp,
} from "./schema";

const STORAGE_KEY = "replydebt_extension_v1";

export async function readStore(): Promise<ExtensionStore> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as ExtensionStore | undefined;
  if (!stored) return createEmptyStore();
  return {
    ...createEmptyStore(),
    ...stored,
    health: { ...createEmptyStore().health, ...stored.health },
  };
}

export async function writeStore(store: ExtensionStore): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: store });
}

export async function updateStore(
  mutator: (store: ExtensionStore) => ExtensionStore | void,
): Promise<ExtensionStore> {
  const current = await readStore();
  const next = mutator(current) ?? current;
  await writeStore(next);
  return next;
}

export async function applyItemAction(
  itemId: string,
  action: ItemAction,
): Promise<PendingItemRecord | null> {
  let updated: PendingItemRecord | null = null;

  await updateStore((store) => {
    const index = store.items.findIndex((item) => item.id === itemId);
    if (index === -1) return;

    const item = store.items[index]!;
    const now = Date.now();

    switch (action) {
      case "done":
        updated = { ...item, status: "done", lastSeenAt: now };
        break;
      case "ignore_contact":
        updated = { ...item, status: "ignored", lastSeenAt: now };
        break;
      case "reset_status":
        updated = {
          ...item,
          status: item.requiresReply === true ? "pending" : "review",
          lastSeenAt: now,
        };
        break;
      default:
        return;
    }

    store.items[index] = updated;
  });

  return updated;
}

export async function ingestScan(payload: ScanPayload): Promise<ExtensionStore> {
  const { mergeScanIntoStore } = await import("../content/shared/accumulator");
  const { updateHealthFromScan } = await import("../content/shared/health");

  let next = createEmptyStore();
  await updateStore((store) => {
    next = mergeScanIntoStore(store, payload);
    next = updateHealthFromScan(next, payload);
    return next;
  });
  return next;
}

export async function clearAllData(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

export function getItemsForApp(
  store: ExtensionStore,
  app: SourceApp,
): PendingItemRecord[] {
  return store.items.filter((item) => item.app === app);
}

export function getDashboardBuckets(store: ExtensionStore) {
  const pending = store.items.filter((item) => item.status === "pending");
  const review = store.items.filter((item) => item.status === "review");
  const done = store.items.filter((item) => item.status === "done");
  const ignored = store.items.filter((item) => item.status === "ignored");

  return { pending, review, done, ignored };
}
