import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  path.join(root, ".next"),
  path.join(root, "src-tauri", "standalone"),
];

for (const target of targets) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`Removed ${path.relative(root, target)}/`);
  }
}

console.log("Dev cache cleared. Run npm run dev");
