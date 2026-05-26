import { APP_PROMPT_PROFILES } from "./prompts/profiles";
import {
  SOURCE_APPS,
  SOURCE_APP_LABELS,
  type GuidedScanAppStates,
  type SourceApp,
} from "./types";

export const GUIDED_SCAN_APPS = SOURCE_APPS;
export const GUIDED_SCAN_TOTAL = SOURCE_APPS.length;

export function createInitialAppStates(): GuidedScanAppStates {
  return SOURCE_APPS.reduce((states, app) => {
    states[app] = "pending";
    return states;
  }, {} as GuidedScanAppStates);
}

export function getGuidedScanInstructions(app: SourceApp): string {
  const label = SOURCE_APP_LABELS[app];
  const profile = APP_PROMPT_PROFILES[app];

  return `Open ${label} and go to your conversation list (inbox view — not an open chat). Take a screenshot showing several conversations, then upload it here. Tip: ${profile.platform} — look for ${profile.lastMessageTheirs[0]?.toLowerCase() ?? "unread indicators"}.`;
}

export function getGuidedScanProgress(appStates: GuidedScanAppStates): {
  completedCount: number;
  totalApps: number;
  isComplete: boolean;
} {
  const completedCount = SOURCE_APPS.filter(
    (app) => appStates[app] === "scanned" || appStates[app] === "skipped",
  ).length;

  return {
    completedCount,
    totalApps: GUIDED_SCAN_TOTAL,
    isComplete: completedCount >= GUIDED_SCAN_TOTAL,
  };
}

export function isGuidedScanComplete(appStates: GuidedScanAppStates): boolean {
  return getGuidedScanProgress(appStates).isComplete;
}

export function findNextPendingAppIndex(
  appStates: GuidedScanAppStates,
  fromIndex = 0,
): number | null {
  for (let index = fromIndex; index < SOURCE_APPS.length; index += 1) {
    if (appStates[SOURCE_APPS[index]] === "pending") {
      return index;
    }
  }

  for (let index = 0; index < fromIndex; index += 1) {
    if (appStates[SOURCE_APPS[index]] === "pending") {
      return index;
    }
  }

  return null;
}

export function getAppIndex(app: SourceApp): number {
  return SOURCE_APPS.indexOf(app);
}
