//! PTY management for the embedded Astrolabe Code terminal.
//!
//! Spawns `astrolabe` (or `claude`) in a real PTY so the app panel
//! behaves exactly like an external terminal: full TUI, slash commands,
//! streaming output, resize support.

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use tauri::{Emitter, Manager, WebviewWindow};
use tokio::sync::Mutex;

use crate::claude::find_claude_binary;

// ── State ──

pub struct PtyState {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

struct PtySession {
    master: Box<dyn MasterPty + Send>,
    /// Writer half — cloned from master for concurrent writes.
    writer: Box<dyn Write + Send>,
    child: Box<dyn portable_pty::Child + Send>,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

// ── Event payloads ──

#[derive(Clone, serde::Serialize)]
struct PtyOutputEvent {
    session_id: String,
    data: Vec<u8>,
}

#[derive(Clone, serde::Serialize)]
struct PtyExitEvent {
    session_id: String,
    success: bool,
}

// ── Tauri Commands ──

#[tauri::command]
pub async fn pty_spawn(
    window: WebviewWindow,
    project_path: String,
    rows: Option<u16>,
    cols: Option<u16>,
) -> Result<String, String> {
    let session_id = uuid::Uuid::new_v4().to_string();

    let pty_system = native_pty_system();
    let size = PtySize {
        rows: rows.unwrap_or(24),
        cols: cols.unwrap_or(80),
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Build the command
    let binary = find_claude_binary()?;
    let mut cmd = CommandBuilder::new(&binary);
    cmd.cwd(&project_path);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    // Ensure bun is on PATH for GUI environments
    if let Some(home) = dirs::home_dir() {
        let bun_bin = home.join(".bun").join("bin");
        let current_path = std::env::var("PATH").unwrap_or_default();
        cmd.env("PATH", format!("{}:{}", bun_bin.display(), current_path));
    }

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn process: {}", e))?;

    // Get writer for input
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {}", e))?;

    // Get reader for output
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get PTY reader: {}", e))?;

    // Store session
    let state = window.state::<PtyState>();
    {
        let mut sessions = state.sessions.lock().await;
        sessions.insert(
            session_id.clone(),
            PtySession {
                master: pair.master,
                writer,
                child,
            },
        );
    }

    // Spawn output reader thread
    let sid = session_id.clone();
    let win = window.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let _ = win.emit(
                        "pty-output",
                        PtyOutputEvent {
                            session_id: sid.clone(),
                            data: buf[..n].to_vec(),
                        },
                    );
                }
                Err(_) => break,
            }
        }
        let _ = win.emit(
            "pty-exit",
            PtyExitEvent {
                session_id: sid,
                success: true,
            },
        );
    });

    Ok(session_id)
}

#[tauri::command]
pub async fn pty_write(
    window: WebviewWindow,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let state = window.state::<PtyState>();
    let mut sessions = state.sessions.lock().await;
    let session = sessions
        .get_mut(&session_id)
        .ok_or_else(|| format!("PTY session {} not found", session_id))?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write to PTY: {}", e))?;
    session
        .writer
        .flush()
        .map_err(|e| format!("Failed to flush PTY: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn pty_resize(
    window: WebviewWindow,
    session_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    let state = window.state::<PtyState>();
    let sessions = state.sessions.lock().await;
    let session = sessions
        .get(&session_id)
        .ok_or_else(|| format!("PTY session {} not found", session_id))?;
    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to resize PTY: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn pty_kill(
    window: WebviewWindow,
    session_id: String,
) -> Result<(), String> {
    let state = window.state::<PtyState>();
    let mut sessions: tokio::sync::MutexGuard<'_, HashMap<String, PtySession>> =
        state.sessions.lock().await;
    if let Some(mut session) = sessions.remove(&session_id) {
        let _ = session.child.kill();
    }
    Ok(())
}

// ── Tests ──

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pty_state_default() {
        let state = PtyState::default();
        // Verify we can create state without panic
        let sessions = state.sessions.try_lock().unwrap();
        assert!(sessions.is_empty());
    }

    #[test]
    fn test_pty_spawn_finds_binary() {
        // Verify find_claude_binary works (needed for pty_spawn)
        let result = find_claude_binary();
        assert!(result.is_ok(), "find_claude_binary should succeed");
        let binary = result.unwrap();
        assert!(
            binary.contains("astrolabe") || binary.contains("claude"),
            "Binary should be astrolabe or claude, got: {}",
            binary
        );
    }
}
