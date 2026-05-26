import { classifyAndFilterItems } from "./classify-items";
import { parseModelOutput } from "./parse-model-output";
import {
  applyPriorityBoost,
  matchPriorityContact,
} from "./priority-contacts";
import type { AnalysisResult, PriorityContact, SourceApp } from "./types";

export function buildFailedResult(
  sourceApp: SourceApp,
  rawModelOutput: string,
  warnings: string[],
): AnalysisResult {
  return {
    sourceApp,
    items: [],
    analyzedAt: new Date().toISOString(),
    rawModelOutput,
    warnings,
    parseStatus: "failed",
  };
}

export function processRawAnalysis(
  rawText: string,
  sourceApp: SourceApp,
  priorityContacts: PriorityContact[] = [],
): AnalysisResult {
  if (!rawText.trim()) {
    return buildFailedResult(sourceApp, rawText, [
      "The model response was empty.",
    ]);
  }

  const parsed = parseModelOutput(rawText, sourceApp);
  const classified = classifyAndFilterItems(
    parsed.rawItems,
    sourceApp,
    priorityContacts,
  );
  const warnings = [...parsed.warnings, ...classified.warnings];

  const boostedItems = classified.items.map((item) => {
    const match = matchPriorityContact(
      item.contactName,
      sourceApp,
      priorityContacts,
    );
    return match ? applyPriorityBoost(item, match) : item;
  });

  if (parsed.status === "failed") {
    return buildFailedResult(sourceApp, parsed.rawText, warnings);
  }

  return {
    sourceApp,
    items: boostedItems,
    analyzedAt: new Date().toISOString(),
    rawModelOutput: parsed.rawText,
    warnings: warnings.length > 0 ? warnings : undefined,
    parseStatus: parsed.status,
  };
}
