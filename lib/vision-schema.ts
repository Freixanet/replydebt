import { z } from "zod";

import { isSourceApp, type InboxItem, type SourceApp } from "./types";

const LAST_SENDERS = ["me", "them", "unknown"] as const;

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function normalizeLastSender(value: unknown): (typeof LAST_SENDERS)[number] {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (LAST_SENDERS.includes(normalized as (typeof LAST_SENDERS)[number])) {
      return normalized as (typeof LAST_SENDERS)[number];
    }
  }
  return "unknown";
}

function normalizeConfidence(value: unknown): number {
  if (typeof value === "number") {
    return clampConfidence(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      return clampConfidence(parsed);
    }
  }
  return 0;
}

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export const RawModelItemSchema = z
  .object({
    app: z.unknown().optional(),
    contactName: z.unknown().optional(),
    preview: z.unknown().optional(),
    timestampText: z.unknown().optional(),
    likelyLastSender: z.unknown().optional(),
    confidence: z.unknown().optional(),
    reason: z.unknown().optional(),
    requiresReply: z.unknown().optional(),
  })
  .transform((item) => {
    const preview = normalizeString(
      typeof item.preview === "string" ? item.preview : String(item.preview ?? ""),
      "",
    );

    return {
      app:
        typeof item.app === "string" && isSourceApp(item.app.toLowerCase())
          ? (item.app.toLowerCase() as SourceApp)
          : undefined,
      contactName: normalizeString(
        typeof item.contactName === "string"
          ? item.contactName
          : String(item.contactName ?? ""),
        "Unknown contact",
      ),
      preview: preview.slice(0, 500),
      timestampText: normalizeString(
        typeof item.timestampText === "string"
          ? item.timestampText
          : String(item.timestampText ?? ""),
        "—",
      ),
      likelyLastSender: normalizeLastSender(item.likelyLastSender),
      confidence: normalizeConfidence(item.confidence),
      reason: normalizeString(
        typeof item.reason === "string" ? item.reason : String(item.reason ?? ""),
        "No reason provided.",
      ),
    };
  });

export type RawModelItem = z.infer<typeof RawModelItemSchema>;

export const RawModelResponseSchema = z.object({
  items: z.array(RawModelItemSchema).catch([]),
});

export type RawModelResponse = z.infer<typeof RawModelResponseSchema>;

export type ParseStatus = "ok" | "partial" | "failed";

export interface ParseOutcome {
  status: ParseStatus;
  warnings: string[];
  rawText: string;
  rawItems: RawModelItem[];
}

export interface ClassifyOutcome {
  items: InboxItem[];
  warnings: string[];
}
