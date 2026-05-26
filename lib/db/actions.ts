import type { Priority } from "@/lib/types";

import { getDb } from "./index";
import { upsertPriorityContactByName } from "./priority-contact-queries";
import { getPendingItemById } from "./queries";
import {
  requiresReplyToInitialStatus,
  stringToRequiresReply,
  type ItemAction,
} from "./types";

export interface ItemActionOptions {
  priority?: Priority;
}

function nowIso(): string {
  return new Date().toISOString();
}

function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 60 * 60 * 1000).toISOString();
}

export function applyItemAction(
  itemId: string,
  action: ItemAction,
  options: ItemActionOptions = {},
): boolean {
  const item = getPendingItemById(itemId);
  if (!item) return false;

  const db = getDb();
  const now = nowIso();

  switch (action) {
    case "done":
      db.prepare(
        "UPDATE pending_items SET status = 'done', snoozedUntil = NULL, updatedAt = ? WHERE id = ?",
      ).run(now, itemId);
      return true;

    case "snooze_1h":
      db.prepare(
        "UPDATE pending_items SET status = 'snoozed', snoozedUntil = ?, updatedAt = ? WHERE id = ?",
      ).run(addHours(now, 1), now, itemId);
      return true;

    case "snooze_24h":
      db.prepare(
        "UPDATE pending_items SET status = 'snoozed', snoozedUntil = ?, updatedAt = ? WHERE id = ?",
      ).run(addHours(now, 24), now, itemId);
      return true;

    case "ignore_contact":
      db.prepare(
        "UPDATE contact_threads SET ignored = 1, updatedAt = ? WHERE id = ?",
      ).run(now, item.contactThreadId);
      db.prepare(
        "UPDATE pending_items SET status = 'ignored', snoozedUntil = NULL, updatedAt = ? WHERE id = ?",
      ).run(now, itemId);
      return true;

    case "set_priority": {
      const priority = options.priority;
      if (!priority) return false;

      db.prepare(
        "UPDATE contact_threads SET priority = ?, updatedAt = ? WHERE id = ?",
      ).run(priority, now, item.contactThreadId);
      db.prepare("UPDATE pending_items SET updatedAt = ? WHERE id = ?").run(
        now,
        itemId,
      );

      upsertPriorityContactByName({
        name: item.contactName,
        apps: [item.app],
        priority,
        replyWindow: "24h",
      });
      return true;
    }

    case "restore_contact": {
      db.prepare(
        "UPDATE contact_threads SET ignored = 0, updatedAt = ? WHERE id = ?",
      ).run(now, item.contactThreadId);

      const requiresReply = stringToRequiresReply(item.requiresReply as string);
      const nextStatus = requiresReplyToInitialStatus(requiresReply);
      db.prepare(
        "UPDATE pending_items SET status = ?, snoozedUntil = NULL, updatedAt = ? WHERE id = ?",
      ).run(nextStatus, now, itemId);
      return true;
    }

    case "reset_status": {
      const requiresReply = stringToRequiresReply(item.requiresReply as string);
      const nextStatus = requiresReplyToInitialStatus(requiresReply);
      db.prepare(
        "UPDATE pending_items SET status = ?, snoozedUntil = NULL, updatedAt = ? WHERE id = ?",
      ).run(nextStatus, now, itemId);
      return true;
    }

    default:
      return false;
  }
}
