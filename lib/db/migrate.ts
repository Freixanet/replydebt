import fs from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";

function resolveSchemaPath(): string {
  const explicit = process.env.REPLYDEBT_SCHEMA_PATH?.trim();
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  const candidates = [
    path.join(process.cwd(), "lib/db/schema.sql"),
    path.join(process.cwd(), "standalone/lib/db/schema.sql"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Could not locate lib/db/schema.sql for database migration.");
}

export function migrate(db: Database.Database): void {
  const schemaPath = resolveSchemaPath();
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);
}
