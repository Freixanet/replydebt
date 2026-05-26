export const SHARED_TASK_RULES = [
  "Analyze the conversation list (inbox view) only — not an open chat thread unless the list is not visible.",
  "Identify each visible conversation row; do not invent contacts.",
  "Do NOT draft or suggest reply messages.",
  "Skip obvious automated rows: OTP codes, delivery alerts, newsletters, broadcast channels, system notifications.",
  "If uncertain who sent the last message, set likelyLastSender to \"unknown\" rather than guessing.",
  "The server classifies pending replies. Do NOT return requiresReply.",
];

export const SHARED_CONFIDENCE_RULES = [
  "confidence >= 0.85: clear outgoing prefix (You:/You sent) OR clear unread-from-them signal with readable preview.",
  "confidence 0.55–0.84: plausible but one ambiguous signal — prefer \"unknown\" or lower confidence.",
  "confidence < 0.55: unreadable preview, media-only label, or mixed signals — use \"unknown\".",
  "When unsure, use \"unknown\" (server maps to Review).",
];

export const OUTPUT_SCHEMA_TEXT = `Return a JSON object with an "items" array. Each item:
- app (optional: whatsapp | telegram | instagram | messenger | messages)
- contactName (string)
- preview (string — last message text or media label as shown)
- timestampText (string — as shown in screenshot)
- likelyLastSender ("me" | "them" | "unknown")
- confidence (number 0–1)
- reason (string — 1–2 sentences citing the visual cue used)`;

export function formatBulletList(title: string, items: string[]): string {
  if (items.length === 0) return "";
  return `${title}:\n${items.map((item) => `- ${item}`).join("\n")}`;
}

export function formatExamples(
  examples: import("./types").PromptExample[],
): string {
  return examples
    .map(
      (ex, i) =>
        `Example ${i + 1}: contact="${ex.contactName}", preview="${ex.preview}", likelyLastSender="${ex.likelyLastSender}", confidence=${ex.confidence}, reason="${ex.reason}"`,
    )
    .join("\n");
}
