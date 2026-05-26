import { randomUUID } from "node:crypto";

import type {
  AnalysisResult,
  DashboardData,
  InboxItem,
  PendingItemRecord,
  Priority,
  SourceApp,
} from "@/lib/types";
import {
  computeTopThreeToday,
  enrichPendingItem,
  matchPriorityContact,
} from "@/lib/priority-contacts";

import { getDb } from "./index";
import {
  isOnboardingCompleted,
  listPriorityContacts,
} from "./priority-contact-queries";
import {
  requiresReplyToInitialStatus,
  requiresReplyToString,
  stringToRequiresReply,
  type ItemStatus,
  type PendingItemRow,
  type ScanRow,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function upsertContactThread(
  app: SourceApp,
  contactName: string,
): { id: string; ignored: boolean } {
  const db = getDb();
  const now = nowIso();
  const priorityContacts = listPriorityContacts();
  const match = matchPriorityContact(contactName, app, priorityContacts);
  const threadPriority: Priority = match?.priority ?? "medium";

  const existing = db
    .prepare(
      "SELECT id, ignored FROM contact_threads WHERE app = ? AND contactName = ?",
    )
    .get(app, contactName) as { id: string; ignored: number } | undefined;

  if (existing) {
    if (match) {
      db.prepare(
        "UPDATE contact_threads SET priority = ?, updatedAt = ? WHERE id = ?",
      ).run(threadPriority, now, existing.id);
    } else {
      db.prepare("UPDATE contact_threads SET updatedAt = ? WHERE id = ?").run(
        now,
        existing.id,
      );
    }
    return { id: existing.id, ignored: existing.ignored === 1 };
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO contact_threads (id, app, contactName, priority, ignored, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
  ).run(id, app, contactName, threadPriority, now, now);

  return { id, ignored: false };
}

function upsertPendingItem(
  scanId: string,
  contactThreadId: string,
  app: SourceApp,
  item: InboxItem,
  contactIgnored: boolean,
): void {
  const db = getDb();
  const now = nowIso();
  const requiresReplyStr = requiresReplyToString(item.requiresReply);
  const initialStatus = contactIgnored
    ? "ignored"
    : requiresReplyToInitialStatus(item.requiresReply);

  const existing = db
    .prepare("SELECT id, status, preview FROM pending_items WHERE app = ? AND contactName = ?")
    .get(app, item.contactName) as
    | { id: string; status: ItemStatus; preview: string }
    | undefined;

  if (existing && existing.preview.trim() === item.preview.trim()) {
    return;
  }

  if (existing) {
    const preservedStatuses: ItemStatus[] = ["done", "snoozed", "ignored"];
    const nextStatus = preservedStatuses.includes(existing.status)
      ? existing.status
      : contactIgnored
        ? "ignored"
        : initialStatus;

    db.prepare(
      `UPDATE pending_items SET
        scanId = ?,
        contactThreadId = ?,
        preview = ?,
        timestampText = ?,
        likelyLastSender = ?,
        requiresReply = ?,
        confidence = ?,
        reason = ?,
        status = ?,
        updatedAt = ?
      WHERE id = ?`,
    ).run(
      scanId,
      contactThreadId,
      item.preview,
      item.timestampText,
      item.likelyLastSender,
      requiresReplyStr,
      item.confidence,
      item.reason,
      nextStatus,
      now,
      existing.id,
    );
    return;
  }

  db.prepare(
    `INSERT INTO pending_items (
      id, scanId, contactThreadId, app, contactName, preview, timestampText,
      likelyLastSender, requiresReply, confidence, reason, status, snoozedUntil,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
  ).run(
    randomUUID(),
    scanId,
    contactThreadId,
    app,
    item.contactName,
    item.preview,
    item.timestampText,
    item.likelyLastSender,
    requiresReplyStr,
    item.confidence,
    item.reason,
    initialStatus,
    now,
    now,
  );
}

export function persistScan(
  result: AnalysisResult,
  screenshotFileName: string,
): string {
  const db = getDb();
  const scanId = randomUUID();
  const now = nowIso();

  const insertScan = db.transaction(() => {
    db.prepare(
      `INSERT INTO scans (id, app, screenshotFileName, createdAt, rawModelOutputJson)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      scanId,
      result.sourceApp,
      screenshotFileName,
      now,
      result.rawModelOutput ?? null,
    );

    for (const item of result.items) {
      const thread = upsertContactThread(result.sourceApp, item.contactName);
      upsertPendingItem(scanId, thread.id, result.sourceApp, item, thread.ignored);
    }
  });

  insertScan();
  return scanId;
}

export function expireSnoozedItems(): void {
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `UPDATE pending_items
     SET status = 'pending', snoozedUntil = NULL, updatedAt = ?
     WHERE status = 'snoozed' AND snoozedUntil IS NOT NULL AND snoozedUntil <= ?`,
  ).run(now, now);
}

const ITEM_SELECT = `
  SELECT
    pi.id,
    pi.scanId,
    pi.contactThreadId,
    pi.app,
    pi.contactName,
    pi.preview,
    pi.timestampText,
    pi.likelyLastSender,
    pi.requiresReply,
    pi.confidence,
    pi.reason,
    pi.status,
    pi.snoozedUntil,
    pi.createdAt,
    pi.updatedAt,
    ct.priority,
    ct.ignored AS contactIgnored
  FROM pending_items pi
  JOIN contact_threads ct ON ct.id = pi.contactThreadId
`;

function mapRow(row: PendingItemRow): PendingItemRecord {
  return {
    id: row.id,
    scanId: row.scanId,
    app: row.app as SourceApp,
    contactName: row.contactName,
    preview: row.preview,
    timestampText: row.timestampText,
    likelyLastSender: row.likelyLastSender,
    requiresReply: stringToRequiresReply(row.requiresReply as string),
    confidence: row.confidence,
    reason: row.reason,
    status: row.status,
    snoozedUntil: row.snoozedUntil,
    priority: row.priority,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getDashboardBuckets(): DashboardData {
  expireSnoozedItems();
  const db = getDb();
  const now = nowIso();
  const nowMs = Date.now();
  const priorityContacts = listPriorityContacts();
  const onboardingCompleted = isOnboardingCompleted();

  const rows = db.prepare(`${ITEM_SELECT} ORDER BY pi.updatedAt DESC`).all() as PendingItemRow[];

  const enrich = (row: PendingItemRow) =>
    enrichPendingItem(mapRow(row), priorityContacts, nowMs);

  const pending = rows
    .filter(
      (row) =>
        row.status === "pending" &&
        row.contactIgnored === 0 &&
        (!row.snoozedUntil || row.snoozedUntil <= now),
    )
    .map(enrich);

  const review = rows
    .filter(
      (row) =>
        row.status === "review" &&
        row.contactIgnored === 0 &&
        (!row.snoozedUntil || row.snoozedUntil <= now),
    )
    .map(enrich);

  const done = rows.filter((row) => row.status === "done").map(mapRow);

  const snoozed = rows
    .filter(
      (row) =>
        row.status === "snoozed" &&
        row.snoozedUntil !== null &&
        row.snoozedUntil > now,
    )
    .map(mapRow);

  const ignored = rows
    .filter((row) => row.status === "ignored" || row.contactIgnored === 1)
    .map(mapRow);

  const recentScans = db
    .prepare(
      "SELECT id, app, screenshotFileName, createdAt, rawModelOutputJson FROM scans ORDER BY createdAt DESC LIMIT 10",
    )
    .all() as ScanRow[];

  const latestScan = recentScans[0] ?? null;

  return {
    pending,
    review,
    done,
    snoozed,
    ignored,
    recentScans: recentScans.map((scan) => ({
      id: scan.id,
      app: scan.app,
      screenshotFileName: scan.screenshotFileName,
      createdAt: scan.createdAt,
    })),
    latestScanRawOutput: latestScan?.rawModelOutputJson ?? null,
    latestScanAt: latestScan?.createdAt ?? null,
    totalItems: rows.length,
    priorityContacts,
    onboardingCompleted,
    topThreeToday: computeTopThreeToday(pending),
  };
}

export function getPendingItemById(id: string): PendingItemRow | undefined {
  return getDb()
    .prepare(`${ITEM_SELECT} WHERE pi.id = ?`)
    .get(id) as PendingItemRow | undefined;
}
