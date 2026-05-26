import { NextResponse } from "next/server";

import { getDashboardBuckets } from "@/lib/db/queries";

export async function GET() {
  try {
    const dashboard = getDashboardBuckets();
    return NextResponse.json(dashboard);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
