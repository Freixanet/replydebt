import type { AppPromptProfile } from "../types";

export const instagramProfile: AppPromptProfile = {
  platform: "Instagram DMs (web)",
  lastMessageMine: [
    "\"You:\" prefix in message preview.",
    "Story reply or sent photo label attributed to me in preview.",
  ],
  lastMessageTheirs: [
    "Bold username or unread dot on thread row.",
    "Preview text without You: prefix.",
    "Incoming message snippet in normal weight text.",
  ],
  ambiguousCases: [
    "Message Requests folder vs main inbox — may look similar.",
    "Vanish mode or expired message placeholders.",
    "Emoji-only or reaction-only preview.",
    "Suggested/secondary inbox sections mixed in view.",
  ],
  falsePositives: [
    "Meta / Instagram system threads.",
    "Ad or suggested account messages.",
    "Verification and security code DMs.",
  ],
  optionalFields: ["Note if thread is in Message Requests in reason"],
  examples: [
    {
      contactName: "jane_doe",
      preview: "You: Loved your post!",
      likelyLastSender: "me",
      confidence: 0.9,
      reason: "You: prefix shows I sent the last message.",
    },
    {
      contactName: "photo_studio",
      preview: "Are you still interested?",
      likelyLastSender: "them",
      confidence: 0.86,
      reason: "Unread indicator present; preview has no You: prefix.",
    },
  ],
  confidenceRules: [
    "You: in preview → \"me\" at >= 0.88.",
    "Bold row + no You: → \"them\" at >= 0.8 if preview is readable.",
    "Emoji-only preview → \"unknown\" with confidence < 0.6.",
  ],
};
