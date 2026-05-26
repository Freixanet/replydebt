import {
  REPLY_WINDOW_OPTIONS,
  isSourceApp,
  type Priority,
  type ReplyWindow,
  type SourceApp,
} from "@/lib/types";

import {
  analyzeStaticScreenshot,
  applyStaticItemAction,
  createStaticGuidedScanSession,
  createStaticPriorityContacts,
  deleteStaticPriorityContact,
  getStaticDashboard,
  getStaticGuidedScanSession,
  isStaticSourceApp,
  setStaticGuidedScanCurrentApp,
  setStaticOnboardingCompleted,
  updateStaticGuidedScanApp,
  updateStaticPriorityContact,
  type CreatePriorityContactInput,
} from "./store";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseApiPath(input: string): { pathname: string; searchParams: URLSearchParams } {
  const url = input.startsWith("http")
    ? new URL(input)
    : new URL(input, "http://localhost");

  return { pathname: url.pathname, searchParams: url.searchParams };
}

function isPriority(value: string): value is Priority {
  return value === "high" || value === "medium" || value === "low";
}

function isReplyWindow(value: string): value is ReplyWindow {
  return (REPLY_WINDOW_OPTIONS as readonly string[]).includes(value);
}

function parseCreateInput(raw: unknown): CreatePriorityContactInput | null {
  if (!raw || typeof raw !== "object") return null;

  const body = raw as Record<string, unknown>;
  if (typeof body.name !== "string" || !body.name.trim()) return null;
  if (!isPriority(String(body.priority))) return null;
  if (!isReplyWindow(String(body.replyWindow))) return null;

  const appsRaw = body.apps;
  const apps = Array.isArray(appsRaw)
    ? appsRaw.filter((value): value is SourceApp => isSourceApp(String(value)))
    : [];

  return {
    name: body.name.trim(),
    apps,
    priority: body.priority as Priority,
    replyWindow: body.replyWindow as ReplyWindow,
    notes: typeof body.notes === "string" ? body.notes : "",
  };
}

export async function handleStaticRequest(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const { pathname } = parseApiPath(input);

  try {
    if (pathname === "/api/dashboard" && method === "GET") {
      return jsonResponse(getStaticDashboard());
    }

    if (pathname === "/api/dev-config" && method === "GET") {
      return jsonResponse({ analyzeMode: "mock", devJsonImport: true });
    }

    if (pathname === "/api/onboarding" && method === "POST") {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (body.action !== "complete" && body.action !== "skip") {
        return jsonResponse({ error: "Invalid action. Use complete or skip." }, 400);
      }
      setStaticOnboardingCompleted();
      return jsonResponse({ ok: true });
    }

    if (pathname === "/api/guided-scan") {
      if (method === "GET") {
        return jsonResponse({ session: getStaticGuidedScanSession() });
      }

      if (method === "POST") {
        let restart = false;
        try {
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          restart = body.restart === true;
        } catch {
          restart = false;
        }
        const session = createStaticGuidedScanSession(restart);
        return jsonResponse({ session });
      }

      if (method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          sessionId?: string;
          action?: "skip" | "mark_scanned" | "set_current_app";
          app?: string;
        };

        if (!body.sessionId) {
          return jsonResponse({ error: "sessionId is required." }, 400);
        }
        if (!body.action) {
          return jsonResponse({ error: "action is required." }, 400);
        }
        if (!body.app || !isStaticSourceApp(body.app)) {
          return jsonResponse({ error: "Valid app is required." }, 400);
        }

        let session;
        switch (body.action) {
          case "skip":
            session = updateStaticGuidedScanApp(body.sessionId, body.app, "skipped");
            break;
          case "mark_scanned":
            session = updateStaticGuidedScanApp(body.sessionId, body.app, "scanned");
            break;
          case "set_current_app":
            session = setStaticGuidedScanCurrentApp(body.sessionId, body.app);
            break;
          default:
            return jsonResponse({ error: "Invalid action." }, 400);
        }

        return jsonResponse({ session });
      }
    }

    if (pathname === "/api/priority-contacts") {
      if (method === "GET") {
        const dashboard = getStaticDashboard();
        return jsonResponse({ contacts: dashboard.priorityContacts });
      }

      if (method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          contacts?: unknown[];
          contact?: unknown;
        };

        const inputs: CreatePriorityContactInput[] = [];
        if (Array.isArray(body.contacts)) {
          for (const entry of body.contacts) {
            const parsed = parseCreateInput(entry);
            if (!parsed) {
              return jsonResponse({ error: "Invalid contact in batch." }, 400);
            }
            inputs.push(parsed);
          }
        } else if (body.contact) {
          const parsed = parseCreateInput(body.contact);
          if (!parsed) {
            return jsonResponse({ error: "Invalid contact payload." }, 400);
          }
          inputs.push(parsed);
        } else {
          return jsonResponse({ error: "Missing contact or contacts." }, 400);
        }

        const contacts = createStaticPriorityContacts(inputs);
        return jsonResponse({ contacts });
      }
    }

    const priorityContactMatch = pathname.match(/^\/api\/priority-contacts\/([^/]+)$/);
    if (priorityContactMatch) {
      const id = decodeURIComponent(priorityContactMatch[1]!);

      if (method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        const update: Partial<CreatePriorityContactInput> = {};

        if (typeof body.name === "string" && body.name.trim()) {
          update.name = body.name.trim();
        }
        if (body.priority !== undefined) {
          if (!isPriority(String(body.priority))) {
            return jsonResponse({ error: "Invalid priority." }, 400);
          }
          update.priority = body.priority as Priority;
        }
        if (body.replyWindow !== undefined) {
          if (!isReplyWindow(String(body.replyWindow))) {
            return jsonResponse({ error: "Invalid reply window." }, 400);
          }
          update.replyWindow = body.replyWindow as ReplyWindow;
        }
        if (typeof body.notes === "string") {
          update.notes = body.notes;
        }
        if (Array.isArray(body.apps)) {
          update.apps = body.apps.filter((value): value is SourceApp =>
            isSourceApp(String(value)),
          );
        }

        const contact = updateStaticPriorityContact(id, update);
        if (!contact) {
          return jsonResponse({ error: "Contact not found." }, 404);
        }
        return jsonResponse({ contact });
      }

      if (method === "DELETE") {
        const deleted = deleteStaticPriorityContact(id);
        if (!deleted) {
          return jsonResponse({ error: "Contact not found." }, 404);
        }
        return jsonResponse({ ok: true });
      }
    }

    const itemMatch = pathname.match(/^\/api\/items\/([^/]+)$/);
    if (itemMatch && method === "PATCH") {
      const id = decodeURIComponent(itemMatch[1]!);
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        action?: string;
        priority?: string;
      };

      const actions = [
        "done",
        "snooze_1h",
        "snooze_24h",
        "ignore_contact",
        "set_priority",
        "restore_contact",
        "reset_status",
      ] as const;

      if (!body.action || !actions.includes(body.action as (typeof actions)[number])) {
        return jsonResponse({ error: "Invalid or missing action." }, 400);
      }

      if (body.action === "set_priority") {
        if (!body.priority || !isPriority(body.priority)) {
          return jsonResponse(
            { error: "Missing or invalid priority for set_priority." },
            400,
          );
        }
      }

      const updated = applyStaticItemAction(
        id,
        body.action as (typeof actions)[number],
        {
          priority:
            body.priority && isPriority(body.priority) ? body.priority : undefined,
        },
      );

      if (!updated) {
        return jsonResponse({ error: "Item not found." }, 404);
      }

      return jsonResponse({ ok: true });
    }

    if (pathname === "/api/analyze" && method === "POST") {
      const formData = init?.body instanceof FormData ? init.body : null;
      if (!formData) {
        return jsonResponse({ error: "Expected multipart form data." }, 400);
      }

      const sourceApp = formData.get("sourceApp");
      const screenshot = formData.get("screenshot");
      const rawModelOutput = formData.get("rawModelOutput");

      if (typeof sourceApp !== "string" || !isSourceApp(sourceApp)) {
        return jsonResponse({ error: "Invalid or missing sourceApp." }, 400);
      }

      const hasPastedJson =
        typeof rawModelOutput === "string" && rawModelOutput.trim().length > 0;
      const hasScreenshot = screenshot instanceof File;
      const screenshotFileName =
        hasScreenshot && screenshot instanceof File
          ? screenshot.name
          : hasPastedJson
            ? "pasted-output.json"
            : "mock-screenshot.png";

      try {
        const payload = analyzeStaticScreenshot(
          sourceApp,
          screenshotFileName,
          hasPastedJson ? String(rawModelOutput) : undefined,
        );

        return jsonResponse({
          ...payload.result,
          scanId: payload.scanId,
          dashboard: payload.dashboard,
          analyzeMode: payload.analyzeMode,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to analyze screenshot.";
        return jsonResponse({ error: message }, 502);
      }
    }

    return jsonResponse({ error: `No static handler for ${method} ${pathname}` }, 404);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Static hosting request failed.";
    return jsonResponse({ error: message }, 500);
  }
}
