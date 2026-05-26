"use client";

import { useCallback, useEffect, useState } from "react";

import { AnalysisAlerts } from "@/components/AnalysisAlerts";
import { Dashboard } from "@/components/Dashboard";
import { GuidedScanSheet } from "@/components/guided-scan/GuidedScanSheet";
import { OnboardingSheet } from "@/components/onboarding/OnboardingSheet";
import type { PriorityContactDraft } from "@/components/onboarding/PriorityContactForm";
import { PriorityContactsSheet } from "@/components/settings/PriorityContactsSheet";
import { AppShell } from "@/components/shell/AppShell";
import { UploadSheet } from "@/components/upload/UploadSheet";
import { Button } from "@/components/ui/button";
import { appFetch } from "@/lib/app-fetch";
import { getGuidedScanInstructions } from "@/lib/guided-scan";
import {
  captureCurrentScreen,
  isDesktopApp,
} from "@/lib/desktop/capture-screen";
import type { DashboardTab } from "@/lib/dashboard-view";
import {
  type AnalysisResult,
  type DashboardData,
  type GuidedScanSession,
  type ItemAction,
  type Priority,
  type SourceApp,
} from "@/lib/types";

interface DevConfig {
  analyzeMode: "live" | "mock";
  devJsonImport: boolean;
}

interface AnalyzeErrorBody {
  error?: string;
  rawModelOutput?: string;
  warnings?: string[];
  parseStatus?: AnalysisResult["parseStatus"];
}

interface AnalyzeSuccessBody extends AnalysisResult {
  scanId?: string;
  dashboard?: DashboardData;
}

async function patchGuidedScan(
  sessionId: string,
  action: "skip" | "mark_scanned" | "set_current_app",
  app: SourceApp,
): Promise<GuidedScanSession> {
  const response = await appFetch("/api/guided-scan", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, action, app }),
  });

  const data = (await response.json()) as {
    session?: GuidedScanSession;
    error?: string;
  };

  if (!response.ok || !data.session) {
    throw new Error(data.error ?? "Failed to update guided scan.");
  }

  return data.session;
}

export default function HomeClient() {
  const [sourceApp, setSourceApp] = useState<SourceApp | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [pastedJson, setPastedJson] = useState("");
  const [devConfig, setDevConfig] = useState<DevConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<AnalyzeErrorBody | null>(
    null,
  );
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [guidedScanOpen, setGuidedScanOpen] = useState(false);
  const [guidedSession, setGuidedSession] = useState<GuidedScanSession | null>(
    null,
  );
  const [guidedScreenshot, setGuidedScreenshot] = useState<File | null>(null);
  const [guidedError, setGuidedError] = useState<string | null>(null);
  const [guidedWarnings, setGuidedWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("pending");
  const [dashboardInitialTab, setDashboardInitialTab] = useState<
    DashboardTab | undefined
  >(undefined);
  const [isDesktop, setIsDesktop] = useState(false);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [uploadCaptureError, setUploadCaptureError] = useState<string | null>(
    null,
  );
  const [guidedCaptureError, setGuidedCaptureError] = useState<string | null>(
    null,
  );
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [priorityContactsOpen, setPriorityContactsOpen] = useState(false);

  const mockMode = devConfig?.analyzeMode === "mock";

  async function loadDashboardData(): Promise<DashboardData> {
    const response = await appFetch("/api/dashboard");
    if (!response.ok) {
      throw new Error("Failed to load dashboard.");
    }
    return (await response.json()) as DashboardData;
  }

  const refreshDashboard = useCallback(async () => {
    const data = await loadDashboardData();
    setDashboard(data);
    return data;
  }, []);

  const loadGuidedSession = useCallback(async () => {
    const response = await appFetch("/api/guided-scan");
    if (!response.ok) return null;

    const data = (await response.json()) as { session: GuidedScanSession | null };
    setGuidedSession(data.session);
    return data.session;
  }, []);

  useEffect(() => {
    setIsDesktop(isDesktopApp());
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadDashboardData()
      .then((data) => {
        if (!cancelled) setDashboard(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load saved items.");
      })
      .finally(() => {
        if (!cancelled) setDashboardLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadGuidedSession().catch(() => {
      // Guided scan session is optional on load.
    });
  }, [loadGuidedSession]);

  useEffect(() => {
    let cancelled = false;

    appFetch("/api/dev-config")
      .then((response) => {
        if (!response.ok) return null;
        return response.json() as Promise<DevConfig>;
      })
      .then((data) => {
        if (!cancelled && data) setDevConfig(data);
      })
      .catch(() => {
        // Dev config is optional; ignore fetch errors.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (dashboardInitialTab) {
      setActiveTab(dashboardInitialTab);
      setDashboardInitialTab(undefined);
    }
  }, [dashboardInitialTab]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === "n" && !uploadOpen && !guidedScanOpen) {
        event.preventDefault();
        setUploadOpen(true);
      }

      if (event.key === "Escape" && uploadOpen) {
        setUploadOpen(false);
      }

      if (event.key === "Escape" && guidedScanOpen && !loading) {
        setGuidedScanOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [uploadOpen, guidedScanOpen, loading]);

  function openUpload() {
    setError(null);
    setErrorDetails(null);
    setUploadCaptureError(null);
    setUploadOpen(true);
  }

  function closeUpload() {
    if (!loading && !captureLoading) {
      setUploadOpen(false);
    }
  }

  async function handleUploadCapture() {
    setUploadCaptureError(null);
    setCaptureLoading(true);

    try {
      const file = await captureCurrentScreen();
      setScreenshot(file);
    } catch (err) {
      setUploadCaptureError(
        err instanceof Error ? err.message : "Capture failed.",
      );
    } finally {
      setCaptureLoading(false);
    }
  }

  async function handleGuidedCapture() {
    setGuidedCaptureError(null);
    setCaptureLoading(true);

    try {
      const file = await captureCurrentScreen();
      setGuidedScreenshot(file);
    } catch (err) {
      setGuidedCaptureError(
        err instanceof Error ? err.message : "Capture failed.",
      );
    } finally {
      setCaptureLoading(false);
    }
  }

  async function startGuidedScan(restart = true) {
    setGuidedError(null);
    setGuidedWarnings([]);

    const response = await appFetch("/api/guided-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restart }),
    });

    const data = (await response.json()) as {
      session?: GuidedScanSession;
      error?: string;
    };

    if (!response.ok || !data.session) {
      throw new Error(data.error ?? "Failed to start guided scan.");
    }

    setGuidedSession(data.session);
    setGuidedScreenshot(null);
    setGuidedScanOpen(true);
  }

  async function handleStartGuidedScan() {
    try {
      await startGuidedScan(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start guided scan.");
    }
  }

  async function handleResumeGuidedScan() {
    setGuidedError(null);
    setGuidedWarnings([]);
    setGuidedScreenshot(null);

    const session = await loadGuidedSession();
    if (!session) {
      setError("No guided scan to resume.");
      return;
    }

    setGuidedScanOpen(true);
  }

  async function handleGuidedSelectApp(app: SourceApp) {
    if (!guidedSession || loading) return;

    setGuidedError(null);
    setGuidedScreenshot(null);

    try {
      const session = await patchGuidedScan(
        guidedSession.id,
        "set_current_app",
        app,
      );
      setGuidedSession(session);
    } catch (err) {
      setGuidedError(
        err instanceof Error ? err.message : "Failed to switch app.",
      );
    }
  }

  async function handleGuidedSkip() {
    if (!guidedSession || loading) return;

    setGuidedError(null);
    setGuidedWarnings([]);
    setGuidedScreenshot(null);
    setLoading(true);

    try {
      const session = await patchGuidedScan(
        guidedSession.id,
        "skip",
        guidedSession.currentApp,
      );
      setGuidedSession(session);
    } catch (err) {
      setGuidedError(err instanceof Error ? err.message : "Failed to skip app.");
    } finally {
      setLoading(false);
    }
  }

  function handleGuidedStop() {
    if (!loading) {
      setGuidedScanOpen(false);
      setGuidedScreenshot(null);
      setGuidedError(null);
    }
  }

  function handleGuidedViewPending() {
    setGuidedScanOpen(false);
    setGuidedScreenshot(null);
    setGuidedError(null);
    setDashboardInitialTab("pending");
    void loadGuidedSession();
  }

  async function handleGuidedAnalyze(event: React.FormEvent) {
    event.preventDefault();

    if (!guidedSession) return;

    const currentApp = guidedSession.currentApp;

    if (!mockMode && !guidedScreenshot) {
      setGuidedError("Please upload a screenshot.");
      return;
    }

    setGuidedError(null);
    setGuidedWarnings([]);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("sourceApp", currentApp);
      if (guidedScreenshot) {
        formData.append("screenshot", guidedScreenshot);
      }

      const response = await appFetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as AnalyzeSuccessBody &
        AnalyzeErrorBody;

      if (!response.ok) {
        throw new Error(data.error ?? "Analysis failed.");
      }

      if (data.parseStatus === "failed") {
        throw new Error(data.warnings?.[0] ?? "Analysis failed.");
      }

      if (data.dashboard) {
        setDashboard(data.dashboard);
      } else {
        await refreshDashboard();
      }

      setScanWarnings(data.warnings ?? []);
      setGuidedWarnings(data.warnings ?? []);

      const session = await patchGuidedScan(
        guidedSession.id,
        "mark_scanned",
        currentApp,
      );
      setGuidedSession(session);
      setGuidedScreenshot(null);
    } catch (err) {
      setGuidedError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setErrorDetails(null);

    if (!sourceApp) {
      setError("Please select a source app.");
      return;
    }

    const jsonImportEnabled = devConfig?.devJsonImport === true;
    const hasPastedJson = pastedJson.trim().length > 0;

    if (!mockMode && !screenshot && !(jsonImportEnabled && hasPastedJson)) {
      setError("Please upload a screenshot or paste model JSON.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("sourceApp", sourceApp);
      if (screenshot) {
        formData.append("screenshot", screenshot);
      }
      if (jsonImportEnabled && hasPastedJson) {
        formData.append("rawModelOutput", pastedJson.trim());
      }

      const response = await appFetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as AnalyzeSuccessBody &
        AnalyzeErrorBody;

      if (!response.ok) {
        setErrorDetails({
          error: data.error,
          rawModelOutput: data.rawModelOutput,
          warnings: data.warnings,
          parseStatus: data.parseStatus,
        });
        throw new Error(data.error ?? "Analysis failed.");
      }

      if (data.parseStatus === "failed") {
        setErrorDetails({
          error: data.warnings?.[0] ?? "Analysis failed.",
          rawModelOutput: data.rawModelOutput,
          warnings: data.warnings,
          parseStatus: data.parseStatus,
        });
        throw new Error(data.warnings?.[0] ?? "Analysis failed.");
      }

      if (data.dashboard) {
        setDashboard(data.dashboard);
      } else {
        await refreshDashboard();
      }

      setScanWarnings(data.warnings ?? []);
      setUploadOpen(false);
      setScreenshot(null);
      setPastedJson("");
      setSourceApp(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleItemAction(
    itemId: string,
    action: ItemAction,
    options?: { priority?: Priority },
  ) {
    setActionLoadingId(itemId);
    setError(null);

    try {
      const response = await appFetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, priority: options?.priority }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to update item.");
      }

      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function completeOnboarding(contacts: PriorityContactDraft[]) {
    setOnboardingLoading(true);
    setOnboardingError(null);

    try {
      if (contacts.length > 0) {
        const response = await appFetch("/api/priority-contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contacts }),
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Failed to save priority contacts.");
        }
      }

      const onboardingResponse = await appFetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });

      if (!onboardingResponse.ok) {
        throw new Error("Failed to complete onboarding.");
      }

      await refreshDashboard();
    } catch (err) {
      setOnboardingError(
        err instanceof Error ? err.message : "Failed to complete onboarding.",
      );
    } finally {
      setOnboardingLoading(false);
    }
  }

  async function skipOnboarding() {
    setOnboardingLoading(true);
    setOnboardingError(null);

    try {
      const response = await appFetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip" }),
      });

      if (!response.ok) {
        throw new Error("Failed to skip onboarding.");
      }

      await refreshDashboard();
    } catch (err) {
      setOnboardingError(
        err instanceof Error ? err.message : "Failed to skip onboarding.",
      );
    } finally {
      setOnboardingLoading(false);
    }
  }

  const activeGuidedSession =
    guidedSession?.status === "active" ? guidedSession : null;

  if (dashboardLoading || !dashboard) {
    return (
      <AppShell onAnalyze={openUpload}>
        <div className="px-4 py-16">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </AppShell>
    );
  }

  const showOnboarding = !dashboard.onboardingCompleted;

  return (
    <>
      <AppShell
        dashboard={dashboard}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAnalyze={openUpload}
        onStartGuidedScan={handleStartGuidedScan}
        onOpenPriorityContacts={() => setPriorityContactsOpen(true)}
      >
        {activeGuidedSession && !guidedScanOpen && (
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="text-sm text-text">
              Guided scan in progress ({activeGuidedSession.completedCount}/
              {activeGuidedSession.totalApps})
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleResumeGuidedScan()}
            >
              Resume
            </Button>
          </div>
        )}
        {error && !uploadOpen && !guidedScanOpen && (
          <div className="border-b border-border px-4 py-3">
            <AnalysisAlerts error={error} />
          </div>
        )}
        <Dashboard
          dashboard={dashboard}
          warnings={scanWarnings}
          onItemAction={handleItemAction}
          actionLoadingId={actionLoadingId}
          onAnalyze={openUpload}
          activeTab={activeTab}
        />
      </AppShell>

      <OnboardingSheet
        open={showOnboarding}
        loading={onboardingLoading}
        error={onboardingError}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />

      <PriorityContactsSheet
        open={priorityContactsOpen}
        contacts={dashboard.priorityContacts}
        loading={onboardingLoading}
        onClose={() => setPriorityContactsOpen(false)}
        onRefresh={async () => {
          await refreshDashboard();
        }}
      />

      <UploadSheet
        open={uploadOpen}
        sourceApp={sourceApp}
        screenshot={screenshot}
        pastedJson={pastedJson}
        devConfig={devConfig}
        loading={loading}
        error={error}
        warnings={errorDetails?.warnings}
        rawModelOutput={errorDetails?.rawModelOutput}
        showCapture={isDesktop}
        captureLoading={captureLoading}
        captureError={uploadCaptureError}
        onCapture={() => void handleUploadCapture()}
        onSourceAppChange={setSourceApp}
        onScreenshotChange={setScreenshot}
        onPastedJsonChange={setPastedJson}
        onSubmit={handleSubmit}
        onClose={closeUpload}
      />

      <GuidedScanSheet
        open={guidedScanOpen}
        session={guidedSession}
        dashboard={dashboard}
        screenshot={guidedScreenshot}
        instructions={
          guidedSession
            ? getGuidedScanInstructions(guidedSession.currentApp)
            : ""
        }
        mockMode={mockMode}
        loading={loading}
        error={guidedError}
        warnings={guidedWarnings}
        showCapture={isDesktop}
        captureLoading={captureLoading}
        captureError={guidedCaptureError}
        onCapture={() => void handleGuidedCapture()}
        onScreenshotChange={setGuidedScreenshot}
        onAnalyze={handleGuidedAnalyze}
        onSkip={() => void handleGuidedSkip()}
        onStop={handleGuidedStop}
        onSelectApp={(app) => void handleGuidedSelectApp(app)}
        onViewPending={handleGuidedViewPending}
      />
    </>
  );
}
