CREATE TABLE IF NOT EXISTS contact_threads (
  id TEXT PRIMARY KEY,
  app TEXT NOT NULL,
  contactName TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  ignored INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(app, contactName)
);

CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  app TEXT NOT NULL,
  screenshotFileName TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  rawModelOutputJson TEXT
);

CREATE TABLE IF NOT EXISTS pending_items (
  id TEXT PRIMARY KEY,
  scanId TEXT NOT NULL,
  contactThreadId TEXT NOT NULL,
  app TEXT NOT NULL,
  contactName TEXT NOT NULL,
  preview TEXT NOT NULL DEFAULT '',
  timestampText TEXT NOT NULL DEFAULT '',
  likelyLastSender TEXT NOT NULL CHECK (likelyLastSender IN ('me', 'them', 'unknown')),
  requiresReply TEXT NOT NULL CHECK (requiresReply IN ('true', 'false', 'review')),
  confidence REAL NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('pending', 'review', 'done', 'snoozed', 'ignored')),
  snoozedUntil TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(app, contactName),
  FOREIGN KEY (scanId) REFERENCES scans(id),
  FOREIGN KEY (contactThreadId) REFERENCES contact_threads(id)
);

CREATE INDEX IF NOT EXISTS idx_pending_items_status ON pending_items(status);
CREATE INDEX IF NOT EXISTS idx_pending_items_snoozedUntil ON pending_items(snoozedUntil);

CREATE TABLE IF NOT EXISTS guided_scan_sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  currentAppIndex INTEGER NOT NULL DEFAULT 0,
  appStatesJson TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS priority_contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  appsJson TEXT NOT NULL DEFAULT '[]',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  replyWindowHours INTEGER NOT NULL DEFAULT 24 CHECK (replyWindowHours IN (6, 24, 72, 168)),
  notes TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_priority_contacts_name
  ON priority_contacts (LOWER(TRIM(name)));

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
