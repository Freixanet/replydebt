use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;

use tauri::{Manager, RunEvent, Url};

mod capture;

struct ServerProcess(Mutex<Option<Child>>);

#[cfg(not(debug_assertions))]
const SERVER_PORT: u16 = 43123;

#[cfg(not(debug_assertions))]
fn wait_for_server(port: u16) -> bool {
  for _ in 0..60 {
    if std::net::TcpStream::connect(("127.0.0.1", port)).is_ok() {
      return true;
    }
    std::thread::sleep(Duration::from_millis(200));
  }
  false
}

#[cfg(not(debug_assertions))]
fn start_next_server(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
  let handle = app.handle();
  let resource_dir = handle.path().resource_dir()?;
  let standalone_dir = resource_dir.join("standalone");
  let node_bin = standalone_dir.join("node");
  let schema_path = standalone_dir.join("lib/db/schema.sql");
  let app_data_dir = handle.path().app_data_dir()?;
  std::fs::create_dir_all(&app_data_dir)?;

  let child = Command::new(&node_bin)
    .arg("server.js")
    .current_dir(&standalone_dir)
    .env("PORT", SERVER_PORT.to_string())
    .env("HOSTNAME", "127.0.0.1")
    .env("REPLYDEBT_DATA_DIR", &app_data_dir)
    .env("REPLYDEBT_SCHEMA_PATH", &schema_path)
    .spawn()?;

  handle.manage(ServerProcess(Mutex::new(Some(child))));

  if !wait_for_server(SERVER_PORT) {
    return Err("Next.js server failed to start.".into());
  }

  if let Some(window) = handle.get_webview_window("main") {
    let url = format!("http://127.0.0.1:{SERVER_PORT}");
    window.navigate(Url::parse(&url)?)?;
  }

  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![capture::capture_screen])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      #[cfg(not(debug_assertions))]
      {
        start_next_server(app)?;
      }

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app, event| {
      #[cfg(not(debug_assertions))]
      if matches!(event, RunEvent::Exit) {
        if let Some(state) = app.try_state::<ServerProcess>() {
          if let Ok(mut guard) = state.0.lock() {
            if let Some(mut child) = guard.take() {
              let _ = child.kill();
              let _ = child.wait();
            }
          }
        }
      }
    });
}
