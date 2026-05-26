import type { AppPromptProfile } from "../types";

export const messengerProfile: AppPromptProfile = {
  platform: "Messenger (web)",
  lastMessageMine: [
    "\"You sent\" or \"You:\" in preview text.",
    "\"Sent a photo/video\" with outgoing/you-sent labeling.",
  ],
  lastMessageTheirs: [
    "Blue dot or bold thread row for unread.",
    "Preview without You sent / You: prefix.",
    "Incoming message text from contact name shown.",
  ],
  ambiguousCases: [
    "Marketplace buyer/seller threads mixed with personal chats.",
    "Message Requests section.",
    "Reaction-only or \"Reacted to your message\" previews.",
    "Active status dot vs unread dot confusion.",
  ],
  falsePositives: [
    "Facebook / Messenger system notifications.",
    "Event and birthday reminders.",
    "OTP and account verification messages.",
    "Page broadcast and business automated messages.",
  ],
  optionalFields: ["Note if Marketplace thread in reason"],
  examples: [
    {
      contactName: "Sam Lee",
      preview: "You sent a photo",
      likelyLastSender: "me",
      confidence: 0.89,
      reason: "You sent label indicates my outgoing last message.",
    },
    {
      contactName: "Mom",
      preview: "Call me when free",
      likelyLastSender: "them",
      confidence: 0.87,
      reason: "Blue unread dot visible; preview lacks You sent prefix.",
    },
  ],
  confidenceRules: [
    "You sent / You: → \"me\" at >= 0.88.",
    "Unread dot + plain preview → \"them\" at >= 0.85.",
    "Marketplace or Page thread → lower confidence; verify before \"them\".",
  ],
};
