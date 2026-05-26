import { NextResponse } from "next/server";

import {
  createGuidedScanSession,
  getActiveGuidedScanSession,
  setGuidedScanCurrentApp,
  updateGuidedScanApp,
} from "@/lib/db/guided-scan-queries";
import { isSourceApp, type SourceApp } from "@/lib/types";

export async function GET() {
  const session = getActiveGuidedScanSession();
  return NextResponse.json({ session });
}

export async function POST(request: Request) {
  try {
    let restart = false;

    try {
      const body = (await request.json()) as { restart?: boolean };
      restart = body.restart === true;
    } catch {
      restart = false;
    }

    const session = createGuidedScanSession(restart);
    return NextResponse.json({ session });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start guided scan session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      action?: "skip" | "mark_scanned" | "set_current_app";
      app?: string;
    };

    const sessionId = body.sessionId;
    const action = body.action;
    const app = body.app;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required." },
        { status: 400 },
      );
    }

    if (!action) {
      return NextResponse.json({ error: "action is required." }, { status: 400 });
    }

    if (!app || !isSourceApp(app)) {
      return NextResponse.json({ error: "Valid app is required." }, { status: 400 });
    }

    let session;

    switch (action) {
      case "skip":
        session = updateGuidedScanApp(sessionId, app as SourceApp, "skipped");
        break;
      case "mark_scanned":
        session = updateGuidedScanApp(sessionId, app as SourceApp, "scanned");
        break;
      case "set_current_app":
        session = setGuidedScanCurrentApp(sessionId, app as SourceApp);
        break;
      default:
        return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update guided scan session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
