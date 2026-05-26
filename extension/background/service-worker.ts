import {
  applyItemAction,
  clearAllData,
  ingestScan,
  readStore,
} from "../storage/store";
import { MESSAGE, type RuntimeMessage } from "../content/shared/runtime";
import { shouldShowUnknownInsteadOfZero } from "../content/shared/health";
import { getDashboardBuckets } from "../storage/store";

const ALARM_NAME = "replydebt-health-check";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const store = await readStore();
  const { pending } = getDashboardBuckets(store);

  if (shouldShowUnknownInsteadOfZero(store)) {
    await chrome.notifications.create("replydebt-health", {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: "ReplyDebt detection warning",
      message:
        "One or more apps may not be scanning correctly. Open ReplyDebt to review health status.",
      priority: 1,
    });
    return;
  }

  if (pending.length > 0) {
    await chrome.notifications.create("replydebt-pending", {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: "ReplyDebt",
      message: `You may owe ${pending.length} repl${pending.length === 1 ? "y" : "ies"}.`,
      priority: 0,
    });
  }
});

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, _sender, sendResponse) => {
    void (async () => {
      switch (message.type) {
        case MESSAGE.SCAN_RESULT: {
          const store = await ingestScan(message.payload);
          sendResponse({ ok: true, store });
          break;
        }
        case MESSAGE.GET_STORE: {
          sendResponse({ store: await readStore() });
          break;
        }
        case MESSAGE.ITEM_ACTION: {
          await applyItemAction(message.itemId, message.action);
          sendResponse({ store: await readStore() });
          break;
        }
        case MESSAGE.CLEAR_DATA: {
          await clearAllData();
          sendResponse({ ok: true });
          break;
        }
        default:
          sendResponse({ error: "Unknown message" });
      }
    })();

    return true;
  },
);
