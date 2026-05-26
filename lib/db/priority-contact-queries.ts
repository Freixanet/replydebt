import { randomUUID } from "node:crypto";

import {
  REPLY_WINDOW_HOURS,
  type Priority,
  type PriorityContact,
  type ReplyWindow,
  type SourceApp,
  isSourceApp,
  replyWindowFromHours,
} from "@/lib/types";
import { normalizeContactName } from "@/lib/priority-contacts";

import { getDb } from "./index";

const ONBOARDING_KEY = "onboarding_completed";

function nowIso(): string {
  return new Date().toISOString();
}

interface PriorityContactRow {
  id: string;
  name: string;
  appsJson: string;
  priority: Priority;
  replyWindowHours: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

function parseAppsJson(appsJson: string): SourceApp[] {
  try {
    const parsed = JSON.parse(appsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is SourceApp => isSourceApp(value));
  } catch {
    return [];
  }
}

function mapRow(row: PriorityContactRow): PriorityContact {
  return {
    id: row.id,
    name: row.name,
    apps: parseAppsJson(row.appsJson),
    priority: row.priority,
    replyWindow: replyWindowFromHours(row.replyWindowHours),
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listPriorityContacts(): PriorityContact[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM priority_contacts ORDER BY LOWER(TRIM(name)) ASC",
    )
    .all() as PriorityContactRow[];

  return rows.map(mapRow);
}

export interface CreatePriorityContactInput {
  name: string;
  apps: SourceApp[];
  priority: Priority;
  replyWindow: ReplyWindow;
  notes?: string;
}

export function createPriorityContact(
  input: CreatePriorityContactInput,
): PriorityContact {
  const db = getDb();
  const now = nowIso();
  const id = randomUUID();
  const name = input.name.trim();
  const replyWindowHours = REPLY_WINDOW_HOURS[input.replyWindow];

  db.prepare(
    `INSERT INTO priority_contacts (
      id, name, appsJson, priority, replyWindowHours, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    name,
    JSON.stringify(input.apps),
    input.priority,
    replyWindowHours,
    input.notes?.trim() ?? "",
    now,
    now,
  );

  syncThreadPriorityForContact(name, input.apps, input.priority);

  return {
    id,
    name,
    apps: input.apps,
    priority: input.priority,
    replyWindow: input.replyWindow,
    notes: input.notes?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
  };
}

export function createPriorityContactsBatch(
  inputs: CreatePriorityContactInput[],
): PriorityContact[] {
  const db = getDb();
  const insert = db.transaction(() =>
    inputs.map((input) => createPriorityContact(input)),
  );
  return insert();
}

export interface UpdatePriorityContactInput {
  name?: string;
  apps?: SourceApp[];
  priority?: Priority;
  replyWindow?: ReplyWindow;
  notes?: string;
}

export function updatePriorityContact(
  id: string,
  input: UpdatePriorityContactInput,
): PriorityContact | null {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM priority_contacts WHERE id = ?")
    .get(id) as PriorityContactRow | undefined;

  if (!existing) return null;

  const now = nowIso();
  const name = input.name?.trim() ?? existing.name;
  const apps = input.apps ?? parseAppsJson(existing.appsJson);
  const priority = input.priority ?? existing.priority;
  const replyWindowHours = input.replyWindow
    ? REPLY_WINDOW_HOURS[input.replyWindow]
    : existing.replyWindowHours;
  const notes = input.notes !== undefined ? input.notes.trim() : existing.notes;

  db.prepare(
    `UPDATE priority_contacts SET
      name = ?,
      appsJson = ?,
      priority = ?,
      replyWindowHours = ?,
      notes = ?,
      updatedAt = ?
    WHERE id = ?`,
  ).run(
    name,
    JSON.stringify(apps),
    priority,
    replyWindowHours,
    notes,
    now,
    id,
  );

  syncThreadPriorityForContact(name, apps, priority);

  return mapRow({
    ...existing,
    name,
    appsJson: JSON.stringify(apps),
    priority,
    replyWindowHours,
    notes,
    updatedAt: now,
  });
}

export function deletePriorityContact(id: string): boolean {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM priority_contacts WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

export function upsertPriorityContactByName(
  input: CreatePriorityContactInput,
): PriorityContact {
  const db = getDb();
  const normalized = normalizeContactName(input.name);
  const existing = db
    .prepare(
      "SELECT * FROM priority_contacts WHERE LOWER(TRIM(name)) = ? LIMIT 1",
    )
    .get(normalized) as PriorityContactRow | undefined;

  if (existing) {
    const apps = [...new Set([...parseAppsJson(existing.appsJson), ...input.apps])];
    const updated = updatePriorityContact(existing.id, {
      priority: input.priority,
      apps,
      replyWindow: input.replyWindow,
      notes: input.notes ?? existing.notes,
    });
    return updated!;
  }

  return createPriorityContact(input);
}

function syncThreadPriorityForContact(
  name: string,
  apps: SourceApp[],
  priority: Priority,
): void {
  const db = getDb();
  const now = nowIso();
  const normalized = normalizeContactName(name);

  const threads = db
    .prepare(
      "SELECT id, app, contactName FROM contact_threads WHERE LOWER(TRIM(contactName)) = ?",
    )
    .all(normalized) as { id: string; app: SourceApp; contactName: string }[];

  for (const thread of threads) {
    if (apps.length > 0 && !apps.includes(thread.app)) {
      continue;
    }

    db.prepare(
      "UPDATE contact_threads SET priority = ?, updatedAt = ? WHERE id = ?",
    ).run(priority, now, thread.id);
  }
}

export function syncThreadPriorityFromContact(
  name: string,
  app: SourceApp,
): void {
  const contacts = listPriorityContacts();
  const normalized = normalizeContactName(name);
  const match = contacts.find(
    (contact) =>
      normalizeContactName(contact.name) === normalized &&
      (contact.apps.length === 0 || contact.apps.includes(app)),
  );

  if (!match) return;

  const db = getDb();
  const now = nowIso();
  db.prepare(
    `UPDATE contact_threads SET priority = ?, updatedAt = ?
     WHERE LOWER(TRIM(contactName)) = ? AND app = ?`,
  ).run(match.priority, now, normalized, app);
}

export function isOnboardingCompleted(): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(ONBOARDING_KEY) as { value: string } | undefined;
  return row?.value === "1";
}

export function setOnboardingCompleted(): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO app_settings (key, value) VALUES (?, '1') ON CONFLICT(key) DO UPDATE SET value = '1'",
  ).run(ONBOARDING_KEY);
}
