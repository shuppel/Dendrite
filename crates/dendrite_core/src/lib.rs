use wasm_bindgen::prelude::*;
use std::collections::HashMap;

pub mod session;
pub mod storage;
pub mod git;
pub mod visualization;
pub mod export;

use session::{Session, SessionState, CommitRef};
use storage::{GrowthProfile, SessionStats, LifetimeStats};
use visualization::{HeatmapData, LanguageStat};
use export::{ExportOptions, ExportFormat};

// Global session registry for managing active sessions
static mut SESSION_REGISTRY: Option<HashMap<u64, Session>> = None;
static mut NEXT_SESSION_ID: u64 = 1;

fn get_registry() -> &'static mut HashMap<u64, Session> {
    unsafe {
        if SESSION_REGISTRY.is_none() {
            SESSION_REGISTRY = Some(HashMap::new());
        }
        SESSION_REGISTRY.as_mut().unwrap()
    }
}

fn get_next_id() -> u64 {
    unsafe {
        let id = NEXT_SESSION_ID;
        NEXT_SESSION_ID += 1;
        id
    }
}

// ============================================
// Session Management
// ============================================

#[wasm_bindgen]
pub fn init_session() -> u64 {
    let id = get_next_id();
    let session = Session::new(id);
    get_registry().insert(id, session);
    id
}

#[wasm_bindgen]
pub fn record_keystroke(handle: u64) {
    if let Some(session) = get_registry().get_mut(&handle) {
        session.record_keystroke();
    }
}

#[wasm_bindgen]
pub fn record_file_edit(handle: u64, file_path: String, language: String) {
    if let Some(session) = get_registry().get_mut(&handle) {
        session.record_file_edit(file_path, language);
    }
}

#[wasm_bindgen]
pub fn mark_idle(handle: u64) {
    if let Some(session) = get_registry().get_mut(&handle) {
        session.mark_idle();
    }
}

#[wasm_bindgen]
pub fn resume_from_idle(handle: u64) {
    if let Some(session) = get_registry().get_mut(&handle) {
        session.resume_from_idle();
    }
}

#[wasm_bindgen]
pub fn end_session(handle: u64) -> String {
    if let Some(session) = get_registry().get_mut(&handle) {
        session.end();
        let stats = SessionStats::from_session(session);
        serde_json::to_string(&stats).unwrap_or_default()
    } else {
        "{}".to_string()
    }
}

#[wasm_bindgen]
pub fn get_active_session_stats(handle: u64) -> String {
    if let Some(session) = get_registry().get(&handle) {
        let stats = SessionStats::from_session(session);
        serde_json::to_string(&stats).unwrap_or_default()
    } else {
        "{}".to_string()
    }
}

// ============================================
// Storage Operations
// ============================================

#[wasm_bindgen]
pub fn serialize_session(handle: u64) -> String {
    if let Some(session) = get_registry().get(&handle) {
        serde_json::to_string(session).unwrap_or_default()
    } else {
        "{}".to_string()
    }
}

#[wasm_bindgen]
pub fn save_session_to_profile(profile_json: String, session_json: String) -> String {
    let mut profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return profile_json,
    };

    let session: Session = match serde_json::from_str(&session_json) {
        Ok(s) => s,
        Err(_) => return profile_json,
    };

    profile.add_session(session);
    profile.to_json().unwrap_or(profile_json)
}

#[wasm_bindgen]
pub fn create_empty_profile() -> String {
    let profile = GrowthProfile::new();
    profile.to_json().unwrap_or_else(|_| "{}".to_string())
}

#[wasm_bindgen]
pub fn get_profile_stats(profile_json: String) -> String {
    let profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return "{}".to_string(),
    };

    serde_json::to_string(&profile.lifetime_stats).unwrap_or_default()
}

#[wasm_bindgen]
pub fn get_current_streak(profile_json: String) -> u32 {
    let profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return 0,
    };

    profile.lifetime_stats.current_streak
}

#[wasm_bindgen]
pub fn get_longest_streak(profile_json: String) -> u32 {
    let profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return 0,
    };

    profile.lifetime_stats.longest_streak
}

// ============================================
// Git Integration
// ============================================

#[wasm_bindgen]
pub fn add_commit_to_session(handle: u64, commit_json: String) {
    let commit: CommitRef = match serde_json::from_str(&commit_json) {
        Ok(c) => c,
        Err(_) => return,
    };

    if let Some(session) = get_registry().get_mut(&handle) {
        session.add_commit(commit);
    }
}

#[wasm_bindgen]
pub fn get_commit_correlations(profile_json: String) -> String {
    let profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return "[]".to_string(),
    };

    let correlations = git::get_commit_correlations(&profile);
    serde_json::to_string(&correlations).unwrap_or_else(|_| "[]".to_string())
}

// ============================================
// Visualization
// ============================================

#[wasm_bindgen]
pub fn generate_heatmap(profile_json: String, weeks: u8) -> String {
    let profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return "{}".to_string(),
    };

    let heatmap = visualization::generate_heatmap(&profile, weeks);
    serde_json::to_string(&heatmap).unwrap_or_default()
}

#[wasm_bindgen]
pub fn generate_hourly_distribution(profile_json: String) -> String {
    let profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return "{}".to_string(),
    };

    let hourly = visualization::generate_hourly_distribution(&profile);
    serde_json::to_string(&hourly).unwrap_or_default()
}

#[wasm_bindgen]
pub fn generate_language_breakdown(profile_json: String) -> String {
    let profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return "[]".to_string(),
    };

    let breakdown = visualization::generate_language_breakdown(&profile);
    serde_json::to_string(&breakdown).unwrap_or_else(|_| "[]".to_string())
}

#[wasm_bindgen]
pub fn get_daily_aggregates(profile_json: String, days: u32) -> String {
    let profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return "[]".to_string(),
    };

    let aggregates = visualization::get_daily_aggregates(&profile, days);
    serde_json::to_string(&aggregates).unwrap_or_else(|_| "[]".to_string())
}

// ============================================
// Export
// ============================================

#[wasm_bindgen]
pub fn export_json(profile_json: String, options_json: String) -> String {
    let profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return "{}".to_string(),
    };

    let options: ExportOptions = match serde_json::from_str(&options_json) {
        Ok(o) => o,
        Err(_) => ExportOptions::default(),
    };

    export::export_json(&profile, &options).unwrap_or_default()
}

#[wasm_bindgen]
pub fn export_markdown(profile_json: String, options_json: String) -> String {
    let profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return "# Error parsing profile\n".to_string(),
    };

    let options: ExportOptions = match serde_json::from_str(&options_json) {
        Ok(o) => o,
        Err(_) => ExportOptions::default(),
    };

    export::export_markdown(&profile, &options)
}

#[wasm_bindgen]
pub fn export_heatmap_svg(profile_json: String, weeks: u8) -> String {
    let profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return String::new(),
    };

    export::export_heatmap_svg(&profile, weeks)
}

#[wasm_bindgen]
pub fn generate_badge_svg(profile_json: String) -> String {
    let profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return String::new(),
    };

    export::generate_badge_svg(&profile)
}

#[wasm_bindgen]
pub fn generate_badge_url(profile_json: String) -> String {
    let profile: GrowthProfile = match serde_json::from_str(&profile_json) {
        Ok(p) => p,
        Err(_) => return String::new(),
    };

    export::generate_badge_url(&profile)
}

// ============================================
// Test and Utilities
// ============================================

#[wasm_bindgen]
pub fn greet() -> String {
    "Hello from Dendrite Core!".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_lifecycle() {
        let handle = init_session();
        assert!(handle > 0);

        record_keystroke(handle);
        record_file_edit(handle, "test.rs".to_string(), "rust".to_string());

        let stats = end_session(handle);
        assert!(!stats.is_empty());
    }

    #[test]
    fn test_profile_creation() {
        let profile_json = create_empty_profile();
        assert!(!profile_json.is_empty());

        let profile: GrowthProfile = serde_json::from_str(&profile_json).unwrap();
        assert!(!profile.id.is_empty());
    }
}
