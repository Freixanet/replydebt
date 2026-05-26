import { execSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWriteStream } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const standaloneRoot = path.join(root, "src-tauri", "standalone");
const NODE_VERSION = "20.18.0";

function run(command) {
  execSync(command, { cwd: root, stdio: "inherit" });
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true, dereference: true, force: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          const redirect = response.headers.location;
          if (!redirect) {
            reject(new Error(`Redirect without location for ${url}`));
            return;
          }
          file.close();
          fs.unlinkSync(dest);
          downloadFile(redirect, dest).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed (${response.statusCode}): ${url}`));
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(undefined);
        });
      })
      .on("error", reject);
  });
}

async function ensureNodeBinary() {
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const nodeDest = path.join(standaloneRoot, "node");
  const localNode = process.execPath;

  if (fs.existsSync(localNode)) {
    fs.copyFileSync(localNode, nodeDest);
    fs.chmodSync(nodeDest, 0o755);
    console.log(`Copied local Node binary (${arch}) to standalone/node`);
    return;
  }

  const tarball = `node-v${NODE_VERSION}-darwin-${arch}.tar.gz`;
  const url = `https://nodejs.org/dist/v${NODE_VERSION}/${tarball}`;
  const tmpDir = path.join(root, ".tmp-tauri-node");
  const archivePath = path.join(tmpDir, tarball);

  fs.mkdirSync(tmpDir, { recursive: true });
  console.log(`Downloading Node.js ${NODE_VERSION} for darwin-${arch}...`);
  await downloadFile(url, archivePath);

  run(`tar -xzf "${archivePath}" -C "${tmpDir}"`);
  const extractedNode = path.join(
    tmpDir,
    `node-v${NODE_VERSION}-darwin-${arch}`,
    "bin",
    "node",
  );

  fs.copyFileSync(extractedNode, nodeDest);
  fs.chmodSync(nodeDest, 0o755);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("Bundled Node binary at standalone/node");
}

function ensureFrontendDistPlaceholder() {
  const outDir = path.join(root, "out");
  fs.mkdirSync(outDir, { recursive: true });
  const indexPath = path.join(outDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(
      indexPath,
      "<!doctype html><html><body>ReplyDebt</body></html>\n",
    );
  }
}

function findStandaloneServerRoot(baseDir) {
  const directServer = path.join(baseDir, "server.js");
  if (fs.existsSync(directServer)) {
    return baseDir;
  }

  for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const found = findStandaloneServerRoot(path.join(baseDir, entry.name));
    if (found) return found;
  }

  return null;
}

async function main() {
  console.log("Building Next.js standalone output...");
  run("REPLYDEBT_STANDALONE=1 npm run build");

  const nextStandalone = path.join(root, ".next", "standalone");
  const nextStatic = path.join(root, ".next", "static");
  const publicDir = path.join(root, "public");
  const schemaSrc = path.join(root, "lib", "db", "schema.sql");

  if (!fs.existsSync(nextStandalone)) {
    throw new Error("Missing .next/standalone. Did next build succeed?");
  }

  const tracedRoot = findStandaloneServerRoot(nextStandalone);
  if (!tracedRoot) {
    throw new Error("Could not find server.js in standalone output.");
  }

  fs.rmSync(standaloneRoot, { recursive: true, force: true });
  fs.mkdirSync(standaloneRoot, { recursive: true });

  copyDir(tracedRoot, standaloneRoot);
  copyDir(nextStatic, path.join(standaloneRoot, ".next", "static"));

  if (fs.existsSync(publicDir)) {
    copyDir(publicDir, path.join(standaloneRoot, "public"));
  }

  const schemaDestDir = path.join(standaloneRoot, "lib", "db");
  fs.mkdirSync(schemaDestDir, { recursive: true });
  fs.copyFileSync(schemaSrc, path.join(schemaDestDir, "schema.sql"));

  const sqliteModule = path.join(
    standaloneRoot,
    "node_modules",
    "better-sqlite3",
  );
  if (!fs.existsSync(sqliteModule)) {
    throw new Error(
      "better-sqlite3 was not traced into standalone output. Check next.config serverExternalPackages.",
    );
  }

  await ensureNodeBinary();
  ensureFrontendDistPlaceholder();

  console.log("Standalone bundle ready at src-tauri/standalone/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
