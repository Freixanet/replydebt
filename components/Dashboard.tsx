"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AnalysisAlerts } from "@/components/AnalysisAlerts";
import { DashboardSearch } from "@/components/dashboard/DashboardSearch";
import { ItemList } from "@/components/dashboard/ItemList";
import { ScansPanel } from "@/components/dashboard/ScansPanel";
import { SummaryBar } from "@/components/dashboard/SummaryBar";
import { TopThreePanel } from "@/components/dashboard/TopThreePanel";
import { Button } from "@/components/ui/button";
import {
  computeSummary,
  sortDoneItems,
  sortIgnoredItems,
  sortPendingItems,
  sortReviewItems,
  sortSnoozedItems,
  type DashboardTab,
} from "@/lib/dashboard-view";
import type { DashboardData, ItemAction, Priority } from "@/lib/types";

interface DashboardProps {
  dashboard: DashboardData;
  warnings?: string[];
  onItemAction: (
    itemId: string,
    action: ItemAction,
    options?: { priority?: Priority },
  ) => void;
  actionLoadingId?: string | null;
  onAnalyze: () => void;
  activeTab: DashboardTab;
}

const EMPTY_MESSAGES: Record<DashboardTab, string> = {
  pending: "Nothing pending. You're caught up.",
  review: "No items need review.",
  snoozed: "No snoozed conversations.",
  done: "No completed items yet.",
  ignored: "No ignored contacts.",
  scans: "No scans yet.",
};

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function Dashboard({
  dashboard,
  warnings,
  onItemAction,
  actionLoadingId,
  onAnalyze,
  activeTab,
}: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const summary = useMemo(() => computeSummary(dashboard), [dashboard]);

  const sortedItems = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return sortPendingItems(dashboard.pending);
      case "review":
        return sortReviewItems(dashboard.review);
      case "snoozed":
        return sortSnoozedItems(dashboard.snoozed);
      case "done":
        return sortDoneItems(dashboard.done);
      case "ignored":
        return sortIgnoredItems(dashboard.ignored);
      default:
        return [];
    }
  }, [activeTab, dashboard]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedItems;
    return sortedItems.filter(
      (item) =>
        item.contactName.toLowerCase().includes(query) ||
        item.preview.toLowerCase().includes(query),
    );
  }, [searchQuery, sortedItems]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [activeTab, searchQuery, filteredItems.length]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      if (activeTab === "scans") return;

      const items = filteredItems;
      if (items.length === 0 && event.key !== "/") return;

      switch (event.key) {
        case "j":
          event.preventDefault();
          setSelectedIndex((current) =>
            Math.min(current + 1, items.length - 1),
          );
          break;
        case "k":
          event.preventDefault();
          setSelectedIndex((current) => Math.max(current - 1, 0));
          break;
        case "e": {
          event.preventDefault();
          const doneItem = items[selectedIndex];
          if (doneItem) onItemAction(doneItem.id, "done");
          break;
        }
        case "s": {
          event.preventDefault();
          const snoozeItem = items[selectedIndex];
          if (snoozeItem) onItemAction(snoozeItem.id, "snooze_24h");
          break;
        }
        case "i": {
          event.preventDefault();
          const ignoreItem = items[selectedIndex];
          if (ignoreItem) onItemAction(ignoreItem.id, "ignore_contact");
          break;
        }
        case "/":
          event.preventDefault();
          searchRef.current?.focus();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, filteredItems, onItemAction, selectedIndex]);

  return (
    <div className="px-4 pb-8">
      <SummaryBar summary={summary} />
      <TopThreePanel items={dashboard.topThreeToday} />

      <div className="pb-4">
        <DashboardSearch
          ref={searchRef}
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {warnings && warnings.length > 0 && (
        <div className="pb-4">
          <AnalysisAlerts warnings={warnings} />
        </div>
      )}

      {activeTab === "scans" ? (
        <ScansPanel dashboard={dashboard} />
      ) : (
        <ItemList
          items={filteredItems}
          emptyMessage={
            activeTab === "pending" && dashboard.totalItems === 0
              ? "Upload a screenshot to find likely pending replies."
              : EMPTY_MESSAGES[activeTab]
          }
          onItemAction={onItemAction}
          actionLoadingId={actionLoadingId}
          showRestore={activeTab === "ignored"}
          selectedIndex={filteredItems.length > 0 ? selectedIndex : -1}
        />
      )}

      {activeTab === "pending" &&
        dashboard.totalItems === 0 &&
        filteredItems.length === 0 && (
          <div className="pt-4 text-center">
            <Button type="button" onClick={onAnalyze}>
              Analyze screenshot
            </Button>
          </div>
        )}
    </div>
  );
}
