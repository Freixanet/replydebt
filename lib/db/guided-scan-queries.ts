import { randomUUID } from "node:crypto";

import {
  createInitialAppStates,
  findNextPendingAppIndex,
  getAppIndex,
  getGuidedScanProgress,
  isGuidedScanComplete,
} from "@/lib/guided-scan";
import {
  SOURCE_APPS,
  type GuidedScanAppStates,
  type GuidedScanAppStatus,
  type GuidedScanSession,
  type SourceApp,
} from "@/lib/types";

import { getDb } from "./index";

interface GuidedScanSessionRow {
  id: string;
  status: "active" | "completed";
  currentAppIndex: number;
  appStatesJson: string;
  createdAt: string;
  updatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseAppStates(json: string): GuidedScanAppStates {
  const parsed = JSON.parse(json) as Partial<GuidedScanAppStates>;
  const states = createInitialAppStates();

  for (const app of SOURCE_APPS) {
    const value = parsed[app];
    if (value === "pending" || value === "scanned" || value === "skipped") {
      states[app] = value;
    }
  }

  return states;
}

function mapSession(row: GuidedScanSessionRow): GuidedScanSession {
  const appStates = parseAppStates(row.appStatesJson);
  const progress = getGuidedScanProgress(appStates);
  const currentApp =
    SOURCE_APPS[row.currentAppIndex] ?? SOURCE_APPS[0] ?? "whatsapp";

  return {
    id: row.id,
    status: row.status,
    currentAppIndex: row.currentAppIndex,
    currentApp,
    appStates,
    completedCount: progress.completedCount,
    totalApps: progress.totalApps,
    isComplete: progress.isComplete,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function getSessionRow(id: string): GuidedScanSessionRow | undefined {
  return getDb()
    .prepare(
      "SELECT id, status, currentAppIndex, appStatesJson, createdAt, updatedAt FROM guided_scan_sessions WHERE id = ?",
    )
    .get(id) as GuidedScanSessionRow | undefined;
}

function saveSession(
  id: string,
  status: GuidedScanSession["status"],
  currentAppIndex: number,
  appStates: GuidedScanAppStates,
): GuidedScanSession {
  const now = nowIso();
  const appStatesJson = JSON.stringify(appStates);

  getDb()
    .prepare(
      `UPDATE guided_scan_sessions
       SET status = ?, currentAppIndex = ?, appStatesJson = ?, updatedAt = ?
       WHERE id = ?`,
    )
    .run(status, currentAppIndex, appStatesJson, now, id);

  const row = getSessionRow(id);
  if (!row) {
    throw new Error("Guided scan session not found.");
  }

  return mapSession(row);
}

export function completeActiveGuidedScanSessions(): void {
  const now = nowIso();
  getDb()
    .prepare(
      "UPDATE guided_scan_sessions SET status = 'completed', updatedAt = ? WHERE status = 'active'",
    )
    .run(now);
}

export function createGuidedScanSession(restart = false): GuidedScanSession {
  const db = getDb();
  const now = nowIso();
  const id = randomUUID();
  const appStates = createInitialAppStates();

  const insert = db.transaction(() => {
    if (restart) {
      completeActiveGuidedScanSessions();
    }

    const active = db
      .prepare(
        "SELECT id, status, currentAppIndex, appStatesJson, createdAt, updatedAt FROM guided_scan_sessions WHERE status = 'active' ORDER BY createdAt DESC LIMIT 1",
      )
      .get() as GuidedScanSessionRow | undefined;

    if (active && !restart) {
      return mapSession(active);
    }

    db.prepare(
      `INSERT INTO guided_scan_sessions (id, status, currentAppIndex, appStatesJson, createdAt, updatedAt)
       VALUES (?, 'active', 0, ?, ?, ?)`,
    ).run(id, JSON.stringify(appStates), now, now);
  });

  const result = insert();
  if (result) {
    return result;
  }

  const row = getSessionRow(id);
  if (!row) {
    throw new Error("Failed to create guided scan session.");
  }

  return mapSession(row);
}

export function getActiveGuidedScanSession(): GuidedScanSession | null {
  const row = getDb()
    .prepare(
      "SELECT id, status, currentAppIndex, appStatesJson, createdAt, updatedAt FROM guided_scan_sessions WHERE status = 'active' ORDER BY createdAt DESC LIMIT 1",
    )
    .get() as GuidedScanSessionRow | undefined;

  return row ? mapSession(row) : null;
}

export function updateGuidedScanApp(
  sessionId: string,
  app: SourceApp,
  status: Exclude<GuidedScanAppStatus, "pending">,
): GuidedScanSession {
  const row = getSessionRow(sessionId);
  if (!row) {
    throw new Error("Guided scan session not found.");
  }

  const appStates = parseAppStates(row.appStatesJson);
  appStates[app] = status;

  let nextIndex = row.currentAppIndex;
  const pendingIndex = findNextPendingAppIndex(appStates);

  if (pendingIndex !== null) {
    nextIndex = pendingIndex;
  } else {
    nextIndex = getAppIndex(app);
  }

  const sessionStatus = isGuidedScanComplete(appStates) ? "completed" : "active";

  return saveSession(sessionId, sessionStatus, nextIndex, appStates);
}

export function setGuidedScanCurrentApp(
  sessionId: string,
  app: SourceApp,
): GuidedScanSession {
  const row = getSessionRow(sessionId);
  if (!row) {
    throw new Error("Guided scan session not found.");
  }

  const appStates = parseAppStates(row.appStatesJson);
  const index = getAppIndex(app);
  if (index < 0) {
    throw new Error("Invalid app for guided scan.");
  }

  return saveSession(sessionId, row.status, index, appStates);
}

export function completeGuidedScanSession(sessionId: string): GuidedScanSession {
  const row = getSessionRow(sessionId);
  if (!row) {
    throw new Error("Guided scan session not found.");
  }

  const appStates = parseAppStates(row.appStatesJson);
  return saveSession(sessionId, "completed", row.currentAppIndex, appStates);
}
