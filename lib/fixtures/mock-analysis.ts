import type { SourceApp } from "@/lib/types";

interface MockItem {
  app: SourceApp;
  contactName: string;
  preview: string;
  timestampText: string;
  likelyLastSender: "me" | "them" | "unknown";
  confidence: number;
  reason: string;
}

function buildMockItems(sourceApp: SourceApp): MockItem[] {
  const appLabel =
    sourceApp === "messages"
      ? "Messages"
      : sourceApp.charAt(0).toUpperCase() + sourceApp.slice(1);

  return [
    {
      app: sourceApp,
      contactName: "Alex Rivera",
      preview: "Are you free tomorrow afternoon?",
      timestampText: "Yesterday",
      likelyLastSender: "them",
      confidence: 0.92,
      reason: `Direct question from contact in ${appLabel} inbox list.`,
    },
    {
      app: sourceApp,
      contactName: "Team Standup",
      preview: "Can you share the doc before the call?",
      timestampText: "10:42",
      likelyLastSender: "them",
      confidence: 0.85,
      reason: "Request that likely needs a reply.",
    },
    {
      app: sourceApp,
      contactName: "Jordan Lee",
      preview: "Maybe we could meet next week",
      timestampText: "Mon",
      likelyLastSender: "unknown",
      confidence: 0.55,
      reason: "Last sender unclear from screenshot layout.",
    },
    {
      app: sourceApp,
      contactName: "Sam Chen",
      preview: "Thanks, that works for me",
      timestampText: "Sun",
      likelyLastSender: "me",
      confidence: 0.88,
      reason: "User appears to have sent the last message.",
    },
    {
      app: sourceApp,
      contactName: "Bank Alerts",
      preview: "Your verification code is 482910. Do not share.",
      timestampText: "09:15",
      likelyLastSender: "them",
      confidence: 0.95,
      reason: "OTP / automated message — should be filtered.",
    },
    {
      app: sourceApp,
      contactName: "Newsletter",
      preview: "Weekly digest: 20% off ends tonight — unsubscribe",
      timestampText: "08:00",
      likelyLastSender: "them",
      confidence: 0.9,
      reason: "Promotional newsletter — should be filtered.",
    },
  ];
}

export function getMockRawModelOutput(sourceApp: SourceApp): string {
  return JSON.stringify({ items: buildMockItems(sourceApp) }, null, 2);
}
