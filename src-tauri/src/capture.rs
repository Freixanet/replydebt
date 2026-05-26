use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureResponse {
  pub data: Vec<u8>,
  pub mime_type: String,
  pub path: String,
}

fn timestamp_ms() -> u128 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis())
    .unwrap_or(0)
}

fn capture_output_path(app: &AppHandle) -> Result<PathBuf, String> {
  let cache_dir = app
    .path()
    .app_cache_dir()
    .map_err(|error| error.to_string())?
    .join("captures");

  std::fs::create_dir_all(&cache_dir).map_err(|error| error.to_string())?;

  Ok(cache_dir.join(format!("capture-{}.png", timestamp_ms())))
}

#[cfg(target_os = "macos")]
fn run_screencapture(output_path: &PathBuf) -> Result<(), String> {
  let status = Command::new("/usr/sbin/screencapture")
    .args(["-m", "-x", "-t", "png"])
    .arg(output_path)
    .status()
    .map_err(|error| format!("Failed to run screencapture: {error}"))?;

  if !output_path.exists() {
    return Err(
      "Screen Recording permission required. Open System Settings → Privacy & Security → Screen Recording and enable ReplyDebt.".into(),
    );
  }

  if !status.success() {
    return Err("Capture failed. Try again or upload a screenshot manually.".into());
  }

  Ok(())
}

#[cfg(not(target_os = "macos"))]
fn run_screencapture(_output_path: &PathBuf) -> Result<(), String> {
  Err("Screen capture is only available in the macOS desktop app.".into())
}

#[tauri::command]
pub async fn capture_screen(app: AppHandle) -> Result<CaptureResponse, String> {
  let output_path = capture_output_path(&app)?;

  if let Some(window) = app.get_webview_window("main") {
    window.hide().map_err(|error| error.to_string())?;
  }

  // Give the window manager a moment to hide ReplyDebt before capture.
  tokio::time::sleep(std::time::Duration::from_millis(250)).await;

  let capture_result = run_screencapture(&output_path);

  if let Some(window) = app.get_webview_window("main") {
    let _ = window.show();
  }

  capture_result?;

  let metadata = std::fs::metadata(&output_path).map_err(|error| error.to_string())?;
  if metadata.len() == 0 {
    return Err(
      "Capture failed. Screen Recording permission may be missing.".into(),
    );
  }

  let data = std::fs::read(&output_path).map_err(|error| error.to_string())?;

  Ok(CaptureResponse {
    data,
    mime_type: "image/png".into(),
    path: output_path.to_string_lossy().into_owned(),
  })
}
