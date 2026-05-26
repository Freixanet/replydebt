import { NextResponse } from "next/server";

import {
  getAnalyzeMode,
  isDevJsonImportEnabled,
} from "@/lib/analyze-config";
import {
  analyzeFromRawText,
  analyzeScreenshot,
} from "@/lib/analyze-screenshot";
import { getMockRawModelOutput } from "@/lib/fixtures/mock-analysis";
import { persistScan, getDashboardBuckets } from "@/lib/db/queries";
import { isSourceApp } from "@/lib/types";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const screenshot = formData.get("screenshot");
    const sourceApp = formData.get("sourceApp");
    const rawModelOutput = formData.get("rawModelOutput");

    if (typeof sourceApp !== "string" || !isSourceApp(sourceApp)) {
      return NextResponse.json(
        { error: "Invalid or missing sourceApp." },
        { status: 400 },
      );
    }

    const analyzeMode = getAnalyzeMode();
    const hasPastedJson =
      typeof rawModelOutput === "string" && rawModelOutput.trim().length > 0;
    const hasScreenshot = screenshot instanceof File;

    if (hasPastedJson) {
      if (!isDevJsonImportEnabled()) {
        return NextResponse.json(
          { error: "JSON import is disabled. Set DEV_JSON_IMPORT=1 in .env.local." },
          { status: 403 },
        );
      }

      const result = analyzeFromRawText(rawModelOutput, sourceApp);
      const screenshotFileName =
        hasScreenshot && screenshot instanceof File
          ? screenshot.name
          : "pasted-output.json";

      if (result.parseStatus === "failed") {
        return NextResponse.json(
          {
            error:
              result.warnings?.[0] ??
              "Could not parse the pasted JSON. Check the format.",
            rawModelOutput: result.rawModelOutput,
            warnings: result.warnings,
            parseStatus: result.parseStatus,
          },
          { status: 502 },
        );
      }

      const scanId = persistScan(result, screenshotFileName);
      const dashboard = getDashboardBuckets();

      return NextResponse.json({
        ...result,
        scanId,
        dashboard,
        analyzeMode: "paste",
      });
    }

    if (analyzeMode === "mock") {
      const result = analyzeFromRawText(
        getMockRawModelOutput(sourceApp),
        sourceApp,
      );
      const screenshotFileName =
        hasScreenshot && screenshot instanceof File
          ? screenshot.name
          : "mock-screenshot.png";

      if (result.parseStatus === "failed") {
        return NextResponse.json(
          {
            error:
              result.warnings?.[0] ??
              "Mock analysis failed unexpectedly.",
            rawModelOutput: result.rawModelOutput,
            warnings: result.warnings,
            parseStatus: result.parseStatus,
          },
          { status: 502 },
        );
      }

      const scanId = persistScan(result, screenshotFileName);
      const dashboard = getDashboardBuckets();

      return NextResponse.json({
        ...result,
        scanId,
        dashboard,
        analyzeMode: "mock",
      });
    }

    if (!hasScreenshot) {
      return NextResponse.json(
        { error: "Screenshot file is required." },
        { status: 400 },
      );
    }

    if (!(screenshot instanceof File)) {
      return NextResponse.json(
        { error: "Screenshot file is required." },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(screenshot.type)) {
      return NextResponse.json(
        { error: "Screenshot must be PNG, JPG, or WEBP." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await screenshot.arrayBuffer());
    const mimeType =
      screenshot.type === "image/jpg" ? "image/jpeg" : screenshot.type;

    const result = await analyzeScreenshot(buffer, mimeType, sourceApp);

    if (result.parseStatus === "failed") {
      return NextResponse.json(
        {
          error:
            result.warnings?.[0] ??
            "Could not parse the model response. Try another screenshot.",
          rawModelOutput: result.rawModelOutput,
          warnings: result.warnings,
          parseStatus: result.parseStatus,
        },
        { status: 502 },
      );
    }

    const scanId = persistScan(result, screenshot.name);
    const dashboard = getDashboardBuckets();

    return NextResponse.json({
      ...result,
      scanId,
      dashboard,
      analyzeMode: "live",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze screenshot.";
    const status = message.includes("GOOGLE_AI_API_KEY") ? 500 : 502;

    return NextResponse.json({ error: message }, { status });
  }
}
