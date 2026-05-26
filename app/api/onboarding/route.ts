import { NextResponse } from "next/server";

import { setOnboardingCompleted } from "@/lib/db/priority-contact-queries";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string };

    if (body.action !== "complete" && body.action !== "skip") {
      return NextResponse.json(
        { error: "Invalid action. Use complete or skip." },
        { status: 400 },
      );
    }

    setOnboardingCompleted();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update onboarding.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
