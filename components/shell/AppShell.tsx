"use client";

import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaticHostingBanner } from "@/components/shell/StaticHostingBanner";
import {
  DASHBOARD_TABS,
  getTabCount,
  type DashboardTab,
} from "@/lib/dashboard-view";
import type { DashboardData } from "@/lib/types";

interface AppShellProps {
  children: React.ReactNode;
  dashboard?: DashboardData | null;
  activeTab?: DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
  onAnalyze: () => void;
  onStartGuidedScan?: () => void;
  onOpenPriorityContacts?: () => void;
}

export function AppShell({
  children,
  dashboard,
  activeTab = "pending",
  onTabChange,
  onAnalyze,
  onStartGuidedScan,
  onOpenPriorityContacts,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 h-12 border-b border-border bg-bg">
        <div className="mx-auto flex h-12 max-w-[880px] items-center gap-4 px-4">
          <span className="shrink-0 text-base font-semibold text-text">
            ReplyDebt
          </span>

          {dashboard && onTabChange && (
            <Tabs
              value={activeTab}
              onValueChange={(value) => onTabChange(value as DashboardTab)}
              className="min-w-0 flex-1"
            >
              <TabsList
                variant="line"
                className="h-8 w-full justify-start gap-0 bg-transparent p-0"
              >
                {DASHBOARD_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="h-8 shrink-0 px-2 text-sm after:bottom-0 data-active:text-text"
                  >
                    {tab.label}
                    <span className="ml-1 text-xs text-muted">
                      {getTabCount(dashboard, tab.id)}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="shrink-0">
                <Settings className="size-4" />
                <span className="sr-only">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onAnalyze}>Analyze</DropdownMenuItem>
              {onStartGuidedScan && (
                <DropdownMenuItem onClick={onStartGuidedScan}>
                  Start Guided Scan
                </DropdownMenuItem>
              )}
              {onOpenPriorityContacts && (
                <DropdownMenuItem onClick={onOpenPriorityContacts}>
                  Priority contacts
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <StaticHostingBanner />
      <main className="mx-auto max-w-[880px]">{children}</main>
    </div>
  );
}
