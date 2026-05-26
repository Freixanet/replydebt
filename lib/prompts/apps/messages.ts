import type { AppPromptProfile } from "../types";

export const messagesProfile: AppPromptProfile = {
  platform: "Apple Messages",
  lastMessageMine: [
    "\"You:\" prefix in list preview when present.",
    "Preview shows my reply text after I responded last.",
    "In list view, last line often mirrors my sent bubble text (blue / iMessage).",
  ],
  lastMessageTheirs: [
    "Gray or green bubble preview text as last line (they sent).",
    "Unread blue dot on conversation row.",
    "Preview is contact's message without You: prefix.",
  ],
  ambiguousCases: [
    "iMessage (blue) vs SMS (green) — color may not show in list-only screenshot.",
    "Tapback / reaction-only preview (\"Liked\", \"Emphasized\").",
    "Group iMessage with member name prefix before text.",
    "Mixed SMS/iMessage thread indicators.",
  ],
  falsePositives: [
    "Short-code OTP and verification texts.",
    "Delivery and shipping alert senders.",
    "Apple system and carrier notification rows.",
  ],
  optionalFields: [
    "Note if group iMessage in reason",
    "Note Tapback-only preview in reason",
  ],
  examples: [
    {
      contactName: "Dad",
      preview: "You: On my way",
      likelyLastSender: "me",
      confidence: 0.93,
      reason: "You: prefix indicates I sent the last message.",
    },
    {
      contactName: "Work Team",
      preview: "Meeting moved to 3pm",
      likelyLastSender: "them",
      confidence: 0.84,
      reason: "Unread dot on row; preview lacks You:; reads as incoming group message.",
    },
  ],
  confidenceRules: [
    "You: prefix → \"me\" at >= 0.9.",
    "Unread dot + no You: → \"them\" at >= 0.8 if preview is clear text.",
    "Reaction-only (Liked/Emphasized) → \"unknown\" with confidence < 0.55.",
  ],
};
