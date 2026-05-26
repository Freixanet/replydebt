import type { DashboardData, PendingItemRecord } from "./types";

export type DashboardTab =
  | "pending"
  | "review"
  | "snoozed"
  | "done"
  | "ignored"
  | "scans";

export const DASHBOARD_TABS: { id: DashboardTab; label: string; shortcut: string }[] =
  [
    { id: "pending", label: "Pending", shortcut: "1" },
    { id: "review", label: "Review", shortcut: "2" },
    { id: "snoozed", label: "Snoozed", shortcut: "3" },
    { id: "done", label: "Done", shortcut: "4" },
    { id: "ignored", label: "Ignored", shortcut: "5" },
    { id: "scans", label: "Scans", shortcut: "6" },
  ];

export interface DashboardSummary {
  owedReplies: number;
  highPriority: number;
  needReview: number;
}

export function computeSummary(dashboard: DashboardData): DashboardSummary {
  return {
    owedReplies: dashboard.pending.length,
    highPriority: dashboard.pending.filter((item) => item.priority === "high")
      .length,
    needReview: dashboard.review.length,
  };
}

function pendingSortRank(item: PendingItemRecord): number {
  const overdue = item.isOverdue ? 0 : 1;
  const highOverdue =
    item.isOverdue && item.priority === "high" ? 0 : 1;
  const priorityRank =
    item.priority === "high" ? 0 : item.priority === "medium" ? 1 : 2;

  return highOverdue * 1000 + overdue * 100 + priorityRank;
}

export function sortPendingItems(items: PendingItemRecord[]): PendingItemRecord[] {
  return [...items].sort((a, b) => {
    const rankDiff = pendingSortRank(a) - pendingSortRank(b);
    if (rankDiff !== 0) return rankDiff;
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });
}

export function sortReviewItems(items: PendingItemRecord[]): PendingItemRecord[] {
  return [...items].sort((a, b) => a.confidence - b.confidence);
}

export function sortSnoozedItems(
  items: PendingItemRecord[],
): PendingItemRecord[] {
  return [...items].sort((a, b) => {
    const aTime = a.snoozedUntil ? new Date(a.snoozedUntil).getTime() : 0;
    const bTime = b.snoozedUntil ? new Date(b.snoozedUntil).getTime() : 0;
    return aTime - bTime;
  });
}

export function sortDoneItems(items: PendingItemRecord[]): PendingItemRecord[] {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function sortIgnoredItems(
  items: PendingItemRecord[],
): PendingItemRecord[] {
  return [...items].sort((a, b) =>
    a.contactName.localeCompare(b.contactName),
  );
}

export function getTabCount(dashboard: DashboardData, tab: DashboardTab): number {
  switch (tab) {
    case "pending":
      return dashboard.pending.length;
    case "review":
      return dashboard.review.length;
    case "snoozed":
      return dashboard.snoozed.length;
    case "done":
      return dashboard.done.length;
    case "ignored":
      return dashboard.ignored.length;
    case "scans":
      return dashboard.recentScans.length;
  }
}
