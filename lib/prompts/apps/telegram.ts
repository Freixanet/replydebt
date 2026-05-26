import type { AppPromptProfile } from "../types";

export const telegramProfile: AppPromptProfile = {
  platform: "Telegram Desktop",
  lastMessageMine: [
    "Preview starts with \"You:\" or outgoing message label.",
    "Read receipts (double check) context suggests my message was last in preview.",
  ],
  lastMessageTheirs: [
    "Unread badge or bold row styling.",
    "Preview text without You: or outgoing label.",
    "Contact name row with unread count.",
  ],
  ambiguousCases: [
    "Channels vs private chats — channel name may look like a contact.",
    "Saved Messages, bots, and forwarded message prefixes.",
    "Sticker/GIF/voice preview without text.",
    "Service messages (joined group, pinned message).",
  ],
  falsePositives: [
    "Telegram channel posts and @channel broadcasts.",
    "Login / verification codes from Telegram.",
    "Bot command responses and service notifications.",
  ],
  optionalFields: ["Note if channel vs private chat in reason"],
  examples: [
    {
      contactName: "Alex",
      preview: "You: Thanks!",
      likelyLastSender: "me",
      confidence: 0.91,
      reason: "You: prefix on preview indicates my last outgoing message.",
    },
    {
      contactName: "Dev Group",
      preview: "New commit pushed",
      likelyLastSender: "them",
      confidence: 0.82,
      reason: "Bold unread row; preview lacks You: prefix; reads as someone else's message.",
    },
  ],
  confidenceRules: [
    "You: prefix → \"me\" at >= 0.9 unless group context is unclear.",
    "Channel icon or broadcast layout → omit row or very low confidence.",
    "Forwarded prefix without You: → prefer \"unknown\" unless sender is obvious.",
  ],
};
