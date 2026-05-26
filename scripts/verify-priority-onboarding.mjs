import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const LOG_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.cursor/debug-ce92d5.log",
);
const SESSION = "ce92d5";

function log(hypothesisId, location, message, data = {}) {
  const entry = {
    sessionId: SESSION,
    runId: "verify",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  fs.appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`);
}

async function loadModule(relativePath) {
  const fullPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    relativePath,
  );
  return import(pathToFileURL(fullPath).href);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "replydebt-verify-"));
  process.env.REPLYDEBT_DATA_DIR = tmpDir;
  process.env.REPLYDEBT_SCHEMA_PATH = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../lib/db/schema.sql",
  );

  const results = { passed: [], failed: [] };

  function pass(name) {
    results.passed.push(name);
    log("ALL", "verify:pass", name, { ok: true });
  }

  function fail(name, err) {
    results.failed.push({ name, error: String(err) });
    log("ALL", "verify:fail", name, { ok: false, error: String(err) });
  }

  try {
    const { getDb } = await loadModule("lib/db/index.ts");
    getDb();
    pass("H-A: DB schema migrates (priority_contacts + app_settings)");
  } catch (err) {
    fail("H-A: DB schema migrates", err);
  }

  try {
    const { getDb } = await loadModule("lib/db/index.ts");
    const db = getDb();
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('priority_contacts','app_settings')",
      )
      .all()
      .map((r) => r.name);
    assert(tables.includes("priority_contacts"), "missing priority_contacts");
    assert(tables.includes("app_settings"), "missing app_settings");
    pass("H-A: required tables exist");
  } catch (err) {
    fail("H-A: required tables exist", err);
  }

  try {
    const {
      createPriorityContact,
      isOnboardingCompleted,
      setOnboardingCompleted,
      listPriorityContacts,
    } = await loadModule("lib/db/priority-contact-queries.ts");

    assert(isOnboardingCompleted() === false, "onboarding should start false");
    const contact = createPriorityContact({
      name: "Alex",
      apps: ["whatsapp"],
      priority: "high",
      replyWindow: "6h",
      notes: "test",
    });
    assert(contact.id, "contact id missing");
    assert(listPriorityContacts().length === 1, "contact not saved");
    setOnboardingCompleted();
    assert(isOnboardingCompleted() === true, "onboarding flag not set");
    log("B", "verify:onboarding", "onboarding lifecycle", {
      contactId: contact.id,
      onboardingCompleted: true,
    });
    pass("H-B: onboarding flag + priority contact CRUD");
  } catch (err) {
    fail("H-B: onboarding flag + priority contact CRUD", err);
  }

  try {
    const { shouldIgnoreItem } = await loadModule("lib/classify-items.ts");
    const contacts = [
      {
        id: "1",
        name: "Alex",
        apps: ["whatsapp"],
        priority: "high",
        replyWindow: "6h",
        notes: "",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const ignored = shouldIgnoreItem(
      "Alex",
      "Your verification code is 123456",
      "whatsapp",
      contacts,
    );
    assert(ignored === false, "high priority should not auto-hide");
    const ignoredOther = shouldIgnoreItem(
      "Stranger",
      "Your verification code is 123456",
      "whatsapp",
      contacts,
    );
    assert(ignoredOther === true, "non-priority should auto-hide OTP");
    log("C", "verify:classify", "high priority skip auto-hide", {
      highIgnored: ignored,
      strangerIgnored: ignoredOther,
    });
    pass("H-C: high-priority contacts skip auto-hide");
  } catch (err) {
    fail("H-C: high-priority contacts skip auto-hide", err);
  }

  try {
    const { matchPriorityContact, applyPriorityBoost } = await loadModule(
      "lib/priority-contacts.ts",
    );
    const contacts = [
      {
        id: "1",
        name: "Alex",
        apps: ["whatsapp"],
        priority: "high",
        replyWindow: "24h",
        notes: "",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const match = matchPriorityContact(" alex ", "whatsapp", contacts);
    assert(match?.name === "Alex", "name match failed");
    const boosted = applyPriorityBoost(
      {
        contactName: "Alex",
        preview: "hey",
        timestampText: "now",
        likelyLastSender: "them",
        requiresReply: "review",
        confidence: 0.6,
        reason: "test",
      },
      match,
    );
    assert(boosted.confidence === 0.75, `boost failed: ${boosted.confidence}`);
    assert(boosted.requiresReply === true, "boost should promote to pending");
    log("C", "verify:boost", "priority boost", {
      confidence: boosted.confidence,
      requiresReply: boosted.requiresReply,
    });
    pass("H-C: name matching + confidence boost");
  } catch (err) {
    fail("H-C: name matching + confidence boost", err);
  }

  try {
    const { getDashboardBuckets } = await loadModule("lib/db/queries.ts");
    const dashboard = getDashboardBuckets();
    assert(Array.isArray(dashboard.priorityContacts), "missing priorityContacts");
    assert(typeof dashboard.onboardingCompleted === "boolean", "missing onboardingCompleted");
    assert(Array.isArray(dashboard.topThreeToday), "missing topThreeToday");
    log("E", "verify:dashboard", "dashboard shape", {
      priorityContacts: dashboard.priorityContacts.length,
      onboardingCompleted: dashboard.onboardingCompleted,
      topThreeCount: dashboard.topThreeToday.length,
    });
    pass("H-E: dashboard returns enriched fields");
  } catch (err) {
    fail("H-E: dashboard returns enriched fields", err);
  }

  try {
    const { applyItemAction } = await loadModule("lib/db/actions.ts");
    const { getDb } = await loadModule("lib/db/index.ts");
    const { listPriorityContacts } = await loadModule(
      "lib/db/priority-contact-queries.ts",
    );
    const db = getDb();
    const now = new Date().toISOString();
    const threadId = crypto.randomUUID();
    const itemId = crypto.randomUUID();
    const scanId = crypto.randomUUID();

    db.prepare(
      "INSERT INTO scans (id, app, screenshotFileName, createdAt) VALUES (?, 'whatsapp', 't.png', ?)",
    ).run(scanId, now);
    db.prepare(
      `INSERT INTO contact_threads (id, app, contactName, priority, ignored, createdAt, updatedAt)
       VALUES (?, 'whatsapp', 'Bob', 'medium', 0, ?, ?)`,
    ).run(threadId, now, now);
    db.prepare(
      `INSERT INTO pending_items (
        id, scanId, contactThreadId, app, contactName, preview, timestampText,
        likelyLastSender, requiresReply, confidence, reason, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, 'whatsapp', 'Bob', 'hi', '1h', 'them', 'true', 0.9, 'r', 'pending', ?, ?)`,
    ).run(itemId, scanId, threadId, now, now);

    const ok = applyItemAction(itemId, "set_priority", { priority: "high" });
    assert(ok, "set_priority failed");
    const pc = listPriorityContacts().find((c) => c.name === "Bob");
    assert(pc?.priority === "high", "priority contact not upserted");
    log("D", "verify:set_priority", "set_priority upsert", {
      bobPriority: pc?.priority,
    });
    pass("H-D: set_priority upserts priority_contacts");
  } catch (err) {
    fail("H-D: set_priority upserts priority_contacts", err);
  }

  log("ALL", "verify:summary", "verification complete", results);
  console.log(JSON.stringify(results, null, 2));
  process.exit(results.failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  log("ALL", "verify:fatal", "fatal error", { error: String(err) });
  console.error(err);
  process.exit(1);
});
