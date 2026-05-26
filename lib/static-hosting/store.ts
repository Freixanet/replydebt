import {
  createInitialAppStates,
  findNextPendingAppIndex,
  getAppIndex,
  getGuidedScanProgress,
  GUIDED_SCAN_TOTAL,
  isGuidedScanComplete,
} from "@/lib/guided-scan";
import { normalizeContactName } from "@/lib/priority-contacts";
import {
  computeTopThreeToday,
  enrichPendingItem,
  matchPriorityContact,
} from "@/lib/priority-contacts";
import { processRawAnalysis } from "@/lib/process-raw-analysis";
import { getMockRawModelOutput } from "@/lib/fixtures/mock-analysis";
import {
  REPLY_WINDOW_HOURS,
  type AnalysisResult,
  type DashboardData,
  type GuidedScanAppStates,
  type GuidedScanAppStatus,
  type GuidedScanSession,
  type InboxItem,
  type ItemAction,
  type PendingItemRecord,
  type Priority,
  type PriorityContact,
  type ReplyWindow,
  type ScanSummary,
  type SourceApp,
  isSourceApp,
} from "@/lib/types";
import {
  requiresReplyToInitialStatus,
  type ItemStatus,
} from "@/lib/db/types";

const STORAGE_KEY = "replydebt-static-v1";

interface ContactThread {
  id: string;
  app: SourceApp;
  contactName: string;
  priority: Priority;
  ignored: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoredItem {
  id: string;
  scanId: string;
  contactThreadId: string;
  app: SourceApp;
  contactName: string;
  preview: string;
  timestampText: string;
  likelyLastSender: PendingItemRecord["likelyLastSender"];
  requiresReply: PendingItemRecord["requiresReply"];
  confidence: number;
  reason: string;
  status: ItemStatus;
  snoozedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StoredScan extends ScanSummary {
  rawModelOutputJson: string | null;
}

interface StaticStoreData {
  items: StoredItem[];
  contactThreads: ContactThread[];
  scans: StoredScan[];
  priorityContacts: PriorityContact[];
  onboardingCompleted: boolean;
  guidedScanSession: GuidedScanSession | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function emptyStore(): StaticStoreData {
  return {
    items: [],
    contactThreads: [],
    scans: [],
    priorityContacts: [],
    onboardingCompleted: false,
    guidedScanSession: null,
  };
}

function loadStore(): StaticStoreData {
  if (typeof window === "undefined") return emptyStore();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    return { ...emptyStore(), ...JSON.parse(raw) } as StaticStoreData;
  } catch {
    return emptyStore();
  }
}

function saveStore(data: StaticStoreData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function mutateStore(mutator: (data: StaticStoreData) => void): StaticStoreData {
  const data = loadStore();
  mutator(data);
  saveStore(data);
  return data;
}

function mapItem(
  item: StoredItem,
  thread: ContactThread,
  priorityContacts: PriorityContact[],
  nowMs: number,
): PendingItemRecord {
  const record: PendingItemRecord = {
    id: item.id,
    scanId: item.scanId,
    app: item.app,
    contactName: item.contactName,
    preview: item.preview,
    timestampText: item.timestampText,
    likelyLastSender: item.likelyLastSender,
    requiresReply: item.requiresReply,
    confidence: item.confidence,
    reason: item.reason,
    status: item.status,
    snoozedUntil: item.snoozedUntil,
    priority: thread.priority,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };

  return enrichPendingItem(record, priorityContacts, nowMs);
}

function getThread(
  data: StaticStoreData,
  threadId: string,
): ContactThread | undefined {
  return data.contactThreads.find((thread) => thread.id === threadId);
}

function upsertContactThread(
  data: StaticStoreData,
  app: SourceApp,
  contactName: string,
): ContactThread {
  const now = nowIso();
  const match = matchPriorityContact(
    contactName,
    app,
    data.priorityContacts,
  );
  const priority: Priority = match?.priority ?? "medium";

  const existing = data.contactThreads.find(
    (thread) => thread.app === app && thread.contactName === contactName,
  );

  if (existing) {
    if (match) {
      existing.priority = priority;
    }
    existing.updatedAt = now;
    return existing;
  }

  const thread: ContactThread = {
    id: newId(),
    app,
    contactName,
    priority,
    ignored: false,
    createdAt: now,
    updatedAt: now,
  };
  data.contactThreads.push(thread);
  return thread;
}

function upsertPendingItem(
  data: StaticStoreData,
  scanId: string,
  thread: ContactThread,
  item: InboxItem,
): void {
  const now = nowIso();
  const initialStatus = thread.ignored
    ? "ignored"
    : requiresReplyToInitialStatus(item.requiresReply);

  const existing = data.items.find(
    (row) => row.app === thread.app && row.contactName === item.contactName,
  );

  if (existing && existing.preview.trim() === item.preview.trim()) {
    return;
  }

  if (existing) {
    const preservedStatuses: ItemStatus[] = ["done", "snoozed", "ignored"];
    existing.scanId = scanId;
    existing.contactThreadId = thread.id;
    existing.preview = item.preview;
    existing.timestampText = item.timestampText;
    existing.likelyLastSender = item.likelyLastSender;
    existing.requiresReply = item.requiresReply;
    existing.confidence = item.confidence;
    existing.reason = item.reason;
    existing.status = preservedStatuses.includes(existing.status)
      ? existing.status
      : thread.ignored
        ? "ignored"
        : initialStatus;
    existing.updatedAt = now;
    return;
  }

  data.items.push({
    id: newId(),
    scanId,
    contactThreadId: thread.id,
    app: thread.app,
    contactName: item.contactName,
    preview: item.preview,
    timestampText: item.timestampText,
    likelyLastSender: item.likelyLastSender,
    requiresReply: item.requiresReply,
    confidence: item.confidence,
    reason: item.reason,
    status: initialStatus,
    snoozedUntil: null,
    createdAt: now,
    updatedAt: now,
  });
}

function expireSnoozedItems(data: StaticStoreData): void {
  const now = nowIso();
  for (const item of data.items) {
    if (
      item.status === "snoozed" &&
      item.snoozedUntil &&
      item.snoozedUntil <= now
    ) {
      item.status = "pending";
      item.snoozedUntil = null;
      item.updatedAt = now;
    }
  }
}

export function getStaticDashboard(): DashboardData {
  const data = loadStore();
  expireSnoozedItems(data);
  saveStore(data);

  const now = nowIso();
  const nowMs = Date.now();
  const priorityContacts = data.priorityContacts;

  const rows = [...data.items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const enrichRow = (item: StoredItem) => {
    const thread = getThread(data, item.contactThreadId);
    if (!thread) {
      throw new Error("Missing contact thread for item.");
    }
    return mapItem(item, thread, priorityContacts, nowMs);
  };

  const pending = rows
    .filter((item) => {
      const thread = getThread(data, item.contactThreadId);
      return (
        item.status === "pending" &&
        thread &&
        !thread.ignored &&
        (!item.snoozedUntil || item.snoozedUntil <= now)
      );
    })
    .map(enrichRow);

  const review = rows
    .filter((item) => {
      const thread = getThread(data, item.contactThreadId);
      return (
        item.status === "review" &&
        thread &&
        !thread.ignored &&
        (!item.snoozedUntil || item.snoozedUntil <= now)
      );
    })
    .map(enrichRow);

  const done = rows.filter((item) => item.status === "done").map(enrichRow);
  const snoozed = rows
    .filter(
      (item) =>
        item.status === "snoozed" &&
        item.snoozedUntil !== null &&
        item.snoozedUntil > now,
    )
    .map(enrichRow);

  const ignored = rows
    .filter((item) => {
      const thread = getThread(data, item.contactThreadId);
      return item.status === "ignored" || Boolean(thread?.ignored);
    })
    .map(enrichRow);

  const recentScans = [...data.scans]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 10)
    .map(({ id, app, screenshotFileName, createdAt }) => ({
      id,
      app,
      screenshotFileName,
      createdAt,
    }));

  const latestScan = recentScans[0] ?? null;

  return {
    pending,
    review,
    done,
    snoozed,
    ignored,
    recentScans,
    latestScanRawOutput: latestScan
      ? data.scans.find((scan) => scan.id === latestScan.id)?.rawModelOutputJson ??
        null
      : null,
    latestScanAt: latestScan?.createdAt ?? null,
    totalItems: rows.length,
    priorityContacts,
    onboardingCompleted: data.onboardingCompleted,
    topThreeToday: computeTopThreeToday(pending),
  };
}

export function persistStaticScan(
  result: AnalysisResult,
  screenshotFileName: string,
): string {
  const scanId = newId();
  const now = nowIso();

  mutateStore((data) => {
    data.scans.unshift({
      id: scanId,
      app: result.sourceApp,
      screenshotFileName,
      createdAt: now,
      rawModelOutputJson: result.rawModelOutput ?? null,
    });

    for (const item of result.items) {
      const thread = upsertContactThread(
        data,
        result.sourceApp,
        item.contactName,
      );
      upsertPendingItem(data, scanId, thread, item);
    }
  });

  return scanId;
}

export function applyStaticItemAction(
  itemId: string,
  action: ItemAction,
  options: { priority?: Priority } = {},
): boolean {
  let updated = false;

  mutateStore((data) => {
    const item = data.items.find((row) => row.id === itemId);
    if (!item) return;

    const thread = getThread(data, item.contactThreadId);
    if (!thread) return;

    const now = nowIso();

    switch (action) {
      case "done":
        item.status = "done";
        item.snoozedUntil = null;
        item.updatedAt = now;
        updated = true;
        break;
      case "snooze_1h":
        item.status = "snoozed";
        item.snoozedUntil = addHours(now, 1);
        item.updatedAt = now;
        updated = true;
        break;
      case "snooze_24h":
        item.status = "snoozed";
        item.snoozedUntil = addHours(now, 24);
        item.updatedAt = now;
        updated = true;
        break;
      case "ignore_contact":
        thread.ignored = true;
        thread.updatedAt = now;
        item.status = "ignored";
        item.snoozedUntil = null;
        item.updatedAt = now;
        updated = true;
        break;
      case "set_priority": {
        const priority = options.priority;
        if (!priority) return;
        thread.priority = priority;
        thread.updatedAt = now;
        item.updatedAt = now;
        upsertStaticPriorityContactByName(data, {
          name: item.contactName,
          apps: [item.app],
          priority,
          replyWindow: "24h",
        });
        updated = true;
        break;
      }
      case "restore_contact": {
        thread.ignored = false;
        thread.updatedAt = now;
        item.status = requiresReplyToInitialStatus(item.requiresReply);
        item.snoozedUntil = null;
        item.updatedAt = now;
        updated = true;
        break;
      }
      case "reset_status": {
        item.status = requiresReplyToInitialStatus(item.requiresReply);
        item.snoozedUntil = null;
        item.updatedAt = now;
        updated = true;
        break;
      }
      default:
        break;
    }
  });

  return updated;
}

export interface CreatePriorityContactInput {
  name: string;
  apps: SourceApp[];
  priority: Priority;
  replyWindow: ReplyWindow;
  notes?: string;
}

function upsertStaticPriorityContactByName(
  data: StaticStoreData,
  input: CreatePriorityContactInput,
): PriorityContact {
  const normalized = normalizeContactName(input.name);
  const existing = data.priorityContacts.find(
    (contact) => normalizeContactName(contact.name) === normalized,
  );

  if (existing) {
    const apps = [...new Set([...existing.apps, ...input.apps])];
    return updateStaticPriorityContact(data, existing.id, {
      priority: input.priority,
      apps,
      replyWindow: input.replyWindow,
      notes: input.notes ?? existing.notes,
    })!;
  }

  return createStaticPriorityContact(data, input);
}

export function listStaticPriorityContacts(): PriorityContact[] {
  return loadStore().priorityContacts;
}

export function createStaticPriorityContacts(
  inputs: CreatePriorityContactInput[],
): PriorityContact[] {
  const created: PriorityContact[] = [];
  mutateStore((data) => {
    for (const input of inputs) {
      created.push(createStaticPriorityContact(data, input));
    }
  });
  return created;
}

function createStaticPriorityContact(
  data: StaticStoreData,
  input: CreatePriorityContactInput,
): PriorityContact {
  const now = nowIso();
  const contact: PriorityContact = {
    id: newId(),
    name: input.name.trim(),
    apps: input.apps,
    priority: input.priority,
    replyWindow: input.replyWindow,
    notes: input.notes?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
  };
  data.priorityContacts.push(contact);
  syncStaticThreadPriorityForContact(data, contact.name, contact.apps, contact.priority);
  return contact;
}

export function updateStaticPriorityContact(
  dataOrId: StaticStoreData | string,
  idOrInput: string | Partial<CreatePriorityContactInput>,
  maybeInput?: Partial<CreatePriorityContactInput>,
): PriorityContact | null {
  if (typeof dataOrId === "string") {
    let result: PriorityContact | null = null;
    mutateStore((data) => {
      result = updateStaticPriorityContact(data, dataOrId, idOrInput as Partial<CreatePriorityContactInput>);
    });
    return result;
  }

  const data = dataOrId;
  const id = idOrInput as string;
  const input = maybeInput ?? {};
  const existing = data.priorityContacts.find((contact) => contact.id === id);
  if (!existing) return null;

  const now = nowIso();
  const contact: PriorityContact = {
    ...existing,
    name: input.name?.trim() ?? existing.name,
    apps: input.apps ?? existing.apps,
    priority: input.priority ?? existing.priority,
    replyWindow: input.replyWindow ?? existing.replyWindow,
    notes: input.notes !== undefined ? input.notes.trim() : existing.notes,
    updatedAt: now,
  };

  const index = data.priorityContacts.findIndex((row) => row.id === id);
  data.priorityContacts[index] = contact;
  syncStaticThreadPriorityForContact(data, contact.name, contact.apps, contact.priority);
  return contact;
}

function syncStaticThreadPriorityForContact(
  data: StaticStoreData,
  name: string,
  apps: SourceApp[],
  priority: Priority,
): void {
  const normalized = normalizeContactName(name);
  const now = nowIso();

  for (const thread of data.contactThreads) {
    if (normalizeContactName(thread.contactName) !== normalized) continue;
    if (apps.length > 0 && !apps.includes(thread.app)) continue;
    thread.priority = priority;
    thread.updatedAt = now;
  }
}

export function deleteStaticPriorityContact(id: string): boolean {
  let deleted = false;
  mutateStore((data) => {
    const before = data.priorityContacts.length;
    data.priorityContacts = data.priorityContacts.filter(
      (contact) => contact.id !== id,
    );
    deleted = data.priorityContacts.length < before;
  });
  return deleted;
}

export function setStaticOnboardingCompleted(): void {
  mutateStore((data) => {
    data.onboardingCompleted = true;
  });
}

function mapGuidedScanSession(
  session: GuidedScanSession,
): GuidedScanSession {
  const progress = getGuidedScanProgress(session.appStates);
  return {
    ...session,
    completedCount: progress.completedCount,
    totalApps: progress.totalApps,
    isComplete: progress.isComplete,
  };
}

export function getStaticGuidedScanSession(): GuidedScanSession | null {
  const session = loadStore().guidedScanSession;
  return session ? mapGuidedScanSession(session) : null;
}

export function createStaticGuidedScanSession(restart = false): GuidedScanSession {
  let session!: GuidedScanSession;

  mutateStore((data) => {
    if (restart) {
      if (data.guidedScanSession?.status === "active") {
        data.guidedScanSession.status = "completed";
      }
    } else if (data.guidedScanSession?.status === "active") {
      session = mapGuidedScanSession(data.guidedScanSession);
      return;
    }

    const now = nowIso();
    const appStates = createInitialAppStates();
    session = {
      id: newId(),
      status: "active",
      currentAppIndex: 0,
      currentApp: "whatsapp",
      appStates,
      completedCount: 0,
      totalApps: GUIDED_SCAN_TOTAL,
      isComplete: false,
      createdAt: now,
      updatedAt: now,
    };
    data.guidedScanSession = session;
  });

  return mapGuidedScanSession(session);
}

function updateStaticGuidedScan(
  sessionId: string,
  updater: (session: GuidedScanSession) => GuidedScanSession,
): GuidedScanSession {
  let session!: GuidedScanSession;

  mutateStore((data) => {
    if (!data.guidedScanSession || data.guidedScanSession.id !== sessionId) {
      throw new Error("Guided scan session not found.");
    }
    data.guidedScanSession = updater(data.guidedScanSession);
    session = data.guidedScanSession;
  });

  return mapGuidedScanSession(session);
}

export function updateStaticGuidedScanApp(
  sessionId: string,
  app: SourceApp,
  status: Exclude<GuidedScanAppStatus, "pending">,
): GuidedScanSession {
  return updateStaticGuidedScan(sessionId, (session) => {
    const appStates: GuidedScanAppStates = { ...session.appStates, [app]: status };
    let nextIndex = session.currentAppIndex;
    const pendingIndex = findNextPendingAppIndex(appStates);
    nextIndex = pendingIndex ?? getAppIndex(app);

    return {
      ...session,
      appStates,
      currentAppIndex: nextIndex,
      currentApp: app,
      status: isGuidedScanComplete(appStates) ? "completed" : "active",
      updatedAt: nowIso(),
    };
  });
}

export function setStaticGuidedScanCurrentApp(
  sessionId: string,
  app: SourceApp,
): GuidedScanSession {
  return updateStaticGuidedScan(sessionId, (session) => ({
    ...session,
    currentAppIndex: getAppIndex(app),
    currentApp: app,
    updatedAt: nowIso(),
  }));
}

export function analyzeStaticScreenshot(
  sourceApp: SourceApp,
  screenshotFileName: string,
  rawModelOutput?: string,
): {
  result: AnalysisResult;
  scanId: string;
  dashboard: DashboardData;
  analyzeMode: "mock" | "paste";
} {
  const priorityContacts = listStaticPriorityContacts();
  const result = rawModelOutput
    ? processRawAnalysis(rawModelOutput, sourceApp, priorityContacts)
    : processRawAnalysis(
        getMockRawModelOutput(sourceApp),
        sourceApp,
        priorityContacts,
      );

  if (result.parseStatus === "failed") {
    throw new Error(
      result.warnings?.[0] ?? "Could not parse the analysis output.",
    );
  }

  const scanId = persistStaticScan(result, screenshotFileName);
  return {
    result,
    scanId,
    dashboard: getStaticDashboard(),
    analyzeMode: rawModelOutput ? "paste" : "mock",
  };
}

export function isStaticSourceApp(value: string): value is SourceApp {
  return isSourceApp(value);
}

export { REPLY_WINDOW_HOURS };
