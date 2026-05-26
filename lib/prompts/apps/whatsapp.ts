import type { AppPromptProfile } from "../types";

export const whatsappProfile: AppPromptProfile = {
  platform: "WhatsApp Desktop/Web",
  lastMessageMine: [
    "Preview starts with \"You:\" or localized equivalent (Tú:, Você:).",
    "Outgoing checkmarks visible near preview when I sent last.",
    "No green unread badge when my message is clearly the last one.",
  ],
  lastMessageTheirs: [
    "Preview text starts with contact's words, not \"You:\".",
    "Green unread dot or count on the row.",
    "Media labels like \"Photo\" or \"Voice message\" without You: prefix usually means they sent last.",
  ],
  ambiguousCases: [
    "Group chats with \"~Name:\" prefix — sender may be another member, not the contact name shown.",
    "Voice note, sticker, or photo-only preview without readable text.",
    "Status-only or \"Waiting for this message\" rows.",
    "Archived or muted chats with truncated preview.",
  ],
  falsePositives: [
    "WhatsApp Business automated replies.",
    "OTP / verification code messages.",
    "Channel and newsletter broadcast rows.",
    "\"Waiting for this message\" system state.",
  ],
  optionalFields: ["Note in reason if group chat vs 1:1", "Note if unread badge visible"],
  examples: [
    {
      contactName: "Maria",
      preview: "You: See you tomorrow",
      likelyLastSender: "me",
      confidence: 0.92,
      reason: "Preview has You: prefix indicating my outgoing last message.",
    },
    {
      contactName: "Carlos",
      preview: "Can you call me?",
      likelyLastSender: "them",
      confidence: 0.88,
      reason: "No You: prefix; unread green badge visible; preview reads as incoming text.",
    },
  ],
  confidenceRules: [
    "You: prefix visible → likelyLastSender \"me\" with confidence >= 0.9.",
    "Unread badge + no You: prefix → likelyLastSender \"them\" with confidence >= 0.85.",
    "Group ~Name: prefix → lower confidence or \"unknown\" unless preview clearly shows You:.",
  ],
};
