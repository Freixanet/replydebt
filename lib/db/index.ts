import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { migrate } from "./migrate";

let db: Database.Database | null = null;

function getDataDir(): string {
  const dataDir =
    process.env.REPLYDEBT_DATA_DIR?.trim() ||
    path.join(process.cwd(), "data");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return dataDir;
}

function getDbPath(): string {
  return path.join(getDataDir(), "replydebt.db");
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
  }
  return db;
}
