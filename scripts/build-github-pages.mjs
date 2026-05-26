import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiPath = path.join(root, "app", "api");
const apiBackupPath = path.join(root, "app", "_api_export_skip");

function moveApiRoutesAside() {
  if (!fs.existsSync(apiPath)) return;
  if (fs.existsSync(apiBackupPath)) {
    fs.rmSync(apiBackupPath, { recursive: true, force: true });
  }
  fs.renameSync(apiPath, apiBackupPath);
  console.log("Temporarily moved app/api/ aside for static export.");
}

function restoreApiRoutes() {
  if (fs.existsSync(apiBackupPath)) {
    if (fs.existsSync(apiPath)) {
      fs.rmSync(apiPath, { recursive: true, force: true });
    }
    fs.renameSync(apiBackupPath, apiPath);
    console.log("Restored app/api/ after static export.");
  }
}

moveApiRoutesAside();

try {
  execSync("next build", {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      GITHUB_PAGES: "1",
      NEXT_PUBLIC_STATIC_HOSTING: "1",
    },
  });
  console.log("GitHub Pages export written to out/");
} finally {
  restoreApiRoutes();
}
