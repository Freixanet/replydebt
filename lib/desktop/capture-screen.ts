interface CaptureScreenResponse {
  data: number[];
  mimeType: string;
  path: string;
}

export function isDesktopApp(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

function mapCaptureError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Capture failed. Try again.";

  if (
    message.includes("Screen Recording permission") ||
    message.includes("permission required")
  ) {
    return message;
  }

  if (message.includes("only available in the macOS desktop app")) {
    return message;
  }

  return "Capture failed. Try again or upload a screenshot manually.";
}

export async function captureCurrentScreen(): Promise<File> {
  if (!isDesktopApp()) {
    throw new Error("Screen capture is only available in the desktop app.");
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<CaptureScreenResponse>("capture_screen");
    const bytes = new Uint8Array(result.data);
    const blob = new Blob([bytes], { type: result.mimeType });
    const filename = `capture-${Date.now()}.png`;

    return new File([blob], filename, { type: result.mimeType });
  } catch (error) {
    if (typeof error === "string") {
      throw new Error(error);
    }
    throw new Error(mapCaptureError(error));
  }
}
