import type { NextConfig } from "next";
import path from "node:path";

const isStandaloneBuild = process.env.REPLYDEBT_STANDALONE === "1";

const projectRoot = path.join(__dirname);

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Pin workspace root so Next doesn't pick ~/package-lock.json and watch your whole home folder.
  outputFileTracingRoot: projectRoot,
  turbopack: { root: projectRoot },
  ...(isStandaloneBuild
    ? {
        output: "standalone" as const,
      }
    : {}),
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/src-tauri/standalone/**",
          "**/src-tauri/target/**",
          "**/data/**",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
