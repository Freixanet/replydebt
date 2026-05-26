import { SOURCE_APP_LABELS, type SourceApp } from "@/lib/types";

import { getAppPromptProfile } from "./profiles";
import {
  formatBulletList,
  formatExamples,
  OUTPUT_SCHEMA_TEXT,
  SHARED_CONFIDENCE_RULES,
  SHARED_TASK_RULES,
} from "./shared";

export { getAppIgnoreKeywords } from "./profiles";
export type { AppPromptProfile, PromptExample } from "./types";

export function buildAnalysisPrompt(sourceApp: SourceApp): string {
  const appLabel = SOURCE_APP_LABELS[sourceApp];
  const profile = getAppPromptProfile(sourceApp);

  const sections = [
    `You are analyzing a screenshot of ${profile.platform} (${appLabel}) — conversation list only.`,
    "",
    "Task:",
    ...SHARED_TASK_RULES.map((rule) => `- ${rule}`),
    "",
    formatBulletList("Last message is MINE — look for", profile.lastMessageMine),
    "",
    formatBulletList("Last message is THEIRS — look for", profile.lastMessageTheirs),
    "",
    formatBulletList("Ambiguous — prefer unknown or lower confidence", profile.ambiguousCases),
    "",
    formatBulletList("Skip or omit (false positives)", profile.falsePositives),
    "",
    profile.optionalFields?.length
      ? formatBulletList("Optional notes for reason field", profile.optionalFields)
      : "",
    "",
    "Examples:",
    formatExamples(profile.examples),
    "",
    "Confidence calibration (shared):",
    ...SHARED_CONFIDENCE_RULES.map((rule) => `- ${rule}`),
    "",
    formatBulletList(`${appLabel}-specific confidence`, profile.confidenceRules),
    "",
    OUTPUT_SCHEMA_TEXT,
  ];

  return sections.filter((line) => line !== "").join("\n");
}
