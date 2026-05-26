import type { DashboardSummary } from "@/lib/dashboard-view";

interface SummaryBarProps {
  summary: DashboardSummary;
}

export function SummaryBar({ summary }: SummaryBarProps) {
  return (
    <p className="py-3 text-sm text-muted">
      <span className="font-medium text-text">{summary.owedReplies}</span> pending
      <span className="mx-2 text-border">·</span>
      <span className="font-medium text-text">{summary.highPriority}</span> high
      priority
      <span className="mx-2 text-border">·</span>
      <span className="font-medium text-text">{summary.needReview}</span> review
    </p>
  );
}
