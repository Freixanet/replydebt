import { NextResponse } from "next/server";

import {
  getAnalyzeMode,
  isDevJsonImportEnabled,
} from "@/lib/analyze-config";

export async function GET() {
  return NextResponse.json({
    analyzeMode: getAnalyzeMode(),
    devJsonImport: isDevJsonImportEnabled(),
  });
}
