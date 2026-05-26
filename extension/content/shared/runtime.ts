import type { ScanPayload, SourceApp } from "../../storage/schema";

export const MESSAGE = {
  SCAN_RESULT: "SCAN_RESULT",
  GET_STORE: "GET_STORE",
  ITEM_ACTION: "ITEM_ACTION",
  CLEAR_DATA: "CLEAR_DATA",
} as const;

export type RuntimeMessage =
  | { type: typeof MESSAGE.SCAN_RESULT; payload: ScanPayload }
  | { type: typeof MESSAGE.GET_STORE }
  | {
      type: typeof MESSAGE.ITEM_ACTION;
      itemId: string;
      action: "done" | "ignore_contact" | "reset_status";
    }
  | { type: typeof MESSAGE.CLEAR_DATA };

export function sendScanResult(payload: ScanPayload): void {
  chrome.runtime.sendMessage({ type: MESSAGE.SCAN_RESULT, payload }).catch(() => {
    // Background may be asleep; ignore.
  });
}

export function logSelectorFailure(app: SourceApp, detail: string): void {
  chrome.storage.local
    .get("replydebt_selector_failures")
    .then((result) => {
      const existing = (result.replydebt_selector_failures as string[] | undefined) ?? [];
      const entry = `${new Date().toISOString()} ${app}: SELECTOR_FAILURE ${detail}`;
      return chrome.storage.local.set({
        replydebt_selector_failures: [entry, ...existing].slice(0, 100),
      });
    })
    .catch(() => {
      // Ignore storage errors in content script.
    });
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  waitMs: number,
): (...args: Parameters<T>) => void {
  let timer: number | undefined;

  return (...args: Parameters<T>) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), waitMs);
  };
}

export function observeListMutations(
  root: Element,
  onChange: () => void,
): MutationObserver {
  const observer = new MutationObserver(() => onChange());
  observer.observe(root, { childList: true, subtree: true });
  return observer;
}

export function attachIncrementalScan(
  listRoot: Element | null,
  scan: () => void,
): () => void {
  if (!listRoot) {
    scan();
    return () => undefined;
  }

  const debouncedScan = debounce(scan, 400);
  debouncedScan();

  listRoot.addEventListener("scroll", debouncedScan, { passive: true });
  const observer = observeListMutations(listRoot, debouncedScan);

  return () => {
    listRoot.removeEventListener("scroll", debouncedScan);
    observer.disconnect();
  };
}
