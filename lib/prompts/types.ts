import type { LastSender } from "@/lib/types";

export interface PromptExample {
  contactName: string;
  preview: string;
  likelyLastSender: LastSender;
  confidence: number;
  reason: string;
}

export interface AppPromptProfile {
  platform: string;
  lastMessageMine: string[];
  lastMessageTheirs: string[];
  ambiguousCases: string[];
  falsePositives: string[];
  optionalFields?: string[];
  examples: PromptExample[];
  confidenceRules: string[];
}
