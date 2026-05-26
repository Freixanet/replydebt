export type AnalyzeMode = "live" | "mock";

export function getAnalyzeMode(): AnalyzeMode {
  const explicit = process.env.ANALYZE_MODE?.trim().toLowerCase();
  if (explicit === "mock") return "mock";
  if (explicit === "live") return "live";

  const hasApiKey = Boolean(process.env.GOOGLE_AI_API_KEY?.trim());
  if (process.env.NODE_ENV === "development" && !hasApiKey) {
    return "mock";
  }

  return "live";
}

export function isDevJsonImportEnabled(): boolean {
  return process.env.DEV_JSON_IMPORT === "1";
}
