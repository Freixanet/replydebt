import type { SourceApp } from "@/lib/types";

import { instagramProfile } from "./apps/instagram";
import { messagesProfile } from "./apps/messages";
import { messengerProfile } from "./apps/messenger";
import { telegramProfile } from "./apps/telegram";
import { whatsappProfile } from "./apps/whatsapp";
import type { AppPromptProfile } from "./types";

export const APP_PROMPT_PROFILES: Record<SourceApp, AppPromptProfile> = {
  whatsapp: whatsappProfile,
  telegram: telegramProfile,
  instagram: instagramProfile,
  messenger: messengerProfile,
  messages: messagesProfile,
};

export function getAppPromptProfile(sourceApp: SourceApp): AppPromptProfile {
  return APP_PROMPT_PROFILES[sourceApp];
}

/** Keywords from falsePositives used for server-side filtering. */
export function getAppIgnoreKeywords(sourceApp: SourceApp): string[] {
  const profile = APP_PROMPT_PROFILES[sourceApp];
  return profile.falsePositives.flatMap((entry) => {
    const keywords: string[] = [];
    const lower = entry.toLowerCase();
    if (lower.includes("otp")) keywords.push("otp");
    if (lower.includes("verification")) keywords.push("verification");
    if (lower.includes("channel")) keywords.push("channel");
    if (lower.includes("newsletter")) keywords.push("newsletter");
    if (lower.includes("broadcast")) keywords.push("broadcast");
    if (lower.includes("login")) keywords.push("login code");
    if (lower.includes("system")) keywords.push("system notification");
    if (lower.includes("marketplace")) keywords.push("marketplace");
    if (lower.includes("waiting for this message")) {
      keywords.push("waiting for this message");
    }
    return keywords;
  });
}
