"use client";

import { isStaticHosting } from "@/lib/runtime-config";

export function StaticHostingBanner() {
  if (!isStaticHosting()) return null;

  return (
    <div className="border-b border-accent/30 bg-accent/10 px-4 py-2 text-center text-xs text-zinc-300">
      GitHub Pages demo — mock analysis only, data saved in this browser. Run
      locally or use the desktop app for live Gemini analysis and SQLite storage.
    </div>
  );
}
