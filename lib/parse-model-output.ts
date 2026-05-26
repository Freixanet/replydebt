import {
  RawModelItemSchema,
  RawModelResponseSchema,
  type ParseOutcome,
  type RawModelItem,
} from "./vision-schema";
import type { SourceApp } from "./types";

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : text.trim();
}

function extractJsonObject(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return tryParseJson(text.slice(start, end + 1));
}

function extractJsonArray(text: string): unknown | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return tryParseJson(text.slice(start, end + 1));
}

function normalizePayload(parsed: unknown): unknown {
  if (Array.isArray(parsed)) {
    return { items: parsed };
  }
  return parsed;
}

function salvageItems(parsed: unknown): {
  items: RawModelItem[];
  warnings: string[];
  status: "ok" | "partial" | "failed";
} {
  const wrapped = normalizePayload(parsed);
  const full = RawModelResponseSchema.safeParse(wrapped);

  if (full.success && full.data.items.length > 0) {
    return { items: full.data.items, warnings: [], status: "ok" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { items: [], warnings: ["Unexpected model response shape."], status: "failed" };
  }

  const itemsArray = Array.isArray(parsed)
    ? parsed
    : "items" in parsed && Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items
      : null;

  if (!itemsArray) {
    return { items: [], warnings: ["Unexpected model response shape."], status: "failed" };
  }

  const salvaged: RawModelItem[] = [];
  const warnings: string[] = [];

  itemsArray.forEach((item, index) => {
    const result = RawModelItemSchema.safeParse(item);
    if (result.success) {
      salvaged.push(result.data);
    } else {
      warnings.push(`Skipped invalid item at index ${index}.`);
    }
  });

  if (salvaged.length === 0) {
    return {
      items: [],
      warnings: [...warnings, "No valid conversations could be parsed."],
      status: "failed",
    };
  }

  return {
    items: salvaged,
    warnings,
    status: warnings.length > 0 ? "partial" : "ok",
  };
}

export function parseModelOutput(
  rawText: string,
  _sourceApp: SourceApp,
): ParseOutcome {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      status: "failed",
      warnings: ["The vision model returned an empty response."],
      rawText,
      rawItems: [],
    };
  }

  const attempts = [
    trimmed,
    stripMarkdownFences(trimmed),
  ];

  let parsed: unknown | null = null;

  for (const candidate of attempts) {
    parsed = tryParseJson(candidate);
    if (parsed !== null) break;

    parsed = extractJsonObject(candidate);
    if (parsed !== null) break;

    parsed = extractJsonArray(candidate);
    if (parsed !== null) break;
  }

  if (parsed === null) {
    return {
      status: "failed",
      warnings: ["Invalid JSON from model."],
      rawText,
      rawItems: [],
    };
  }

  const { items, warnings, status } = salvageItems(parsed);

  return {
    status,
    warnings,
    rawText,
    rawItems: items,
  };
}
