use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents the state of a session
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionState {
    Active,
    Idle,
    Paused,
    Ended,
}

impl Default for SessionState {
    fn default() -> Self {
        SessionState::Active
    }
}

/// A gap in activity during a session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdlePeriod {
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub duration_ms: u64,
}

impl IdlePeriod {
    pub fn new(started_at: DateTime<Utc>) -> Self {
        Self {
            started_at,
            ended_at: None,
            duration_ms: 0,
        }
    }

    pub fn end(&mut self, ended_at: DateTime<Utc>) {
        self.ended_at = Some(ended_at);
        self.duration_ms = (ended_at - self.started_at).num_milliseconds() as u64;
    }
}

/// Reference to a git commit made during a session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitRef {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub timestamp: DateTime<Utc>,
    pub files_changed: Vec<String>,
}

impl CommitRef {
    pub fn new(hash: String, message: String, timestamp: DateTime<Utc>, files_changed: Vec<String>) -> Self {
        let short_hash = hash.chars().take(7).collect();
        Self {
            hash,
            short_hash,
            message,
            timestamp,
            files_changed,
        }
    }
}

/// A tracked period of focused work
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: u64,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub active_time_ms: u64,
    pub keystroke_count: u32,
    pub files_edited: Vec<String>,
    pub languages: HashMap<String, u64>,
    pub idle_periods: Vec<IdlePeriod>,
    pub commits: Vec<CommitRef>,
    #[serde(skip)]
    pub state: SessionState,
    #[serde(skip)]
    last_activity: DateTime<Utc>,
    #[serde(skip)]
    current_idle: Option<IdlePeriod>,
}

impl Session {
    pub fn new(id: u64) -> Self {
        let now = Utc::now();
        Self {
            id,
            started_at: now,
            ended_at: None,
            active_time_ms: 0,
            keystroke_count: 0,
            files_edited: Vec::new(),
            languages: HashMap::new(),
            idle_periods: Vec::new(),
            commits: Vec::new(),
            state: SessionState::Active,
            last_activity: now,
            current_idle: None,
        }
    }

    /// Record a keystroke in the session
    pub fn record_keystroke(&mut self) {
        self.keystroke_count += 1;
        self.update_activity_time();
    }

    /// Record a file edit
    pub fn record_file_edit(&mut self, file_path: String, language: String) {
        if !self.files_edited.contains(&file_path) {
            self.files_edited.push(file_path);
        }
        self.update_activity_time();
        
        // Track time spent in this language
        *self.languages.entry(language).or_insert(0) += 1000; // 1 second increment
    }

    /// Mark the session as idle
    pub fn mark_idle(&mut self) {
        if self.state == SessionState::Active {
            self.state = SessionState::Idle;
            self.current_idle = Some(IdlePeriod::new(Utc::now()));
        }
    }

    /// Resume from idle state
    pub fn resume_from_idle(&mut self) {
        if self.state == SessionState::Idle {
            if let Some(mut idle) = self.current_idle.take() {
                idle.end(Utc::now());
                self.idle_periods.push(idle);
            }
            self.state = SessionState::Active;
            self.last_activity = Utc::now();
        }
    }

    /// Pause the session manually
    pub fn pause(&mut self) {
        self.state = SessionState::Paused;
    }

    /// Resume a paused session
    pub fn resume(&mut self) {
        if self.state == SessionState::Paused {
            self.state = SessionState::Active;
            self.last_activity = Utc::now();
        }
    }

    /// End the session
    pub fn end(&mut self) {
        self.ended_at = Some(Utc::now());
        self.state = SessionState::Ended;
        
        // Close any open idle period
        if let Some(mut idle) = self.current_idle.take() {
            idle.end(Utc::now());
            self.idle_periods.push(idle);
        }
    }

    /// Add a commit reference to this session
    pub fn add_commit(&mut self, commit: CommitRef) {
        self.commits.push(commit);
    }

    /// Get the total duration of the session in milliseconds
    pub fn total_duration_ms(&self) -> u64 {
        let end = self.ended_at.unwrap_or_else(Utc::now);
        (end - self.started_at).num_milliseconds() as u64
    }

    /// Calculate active percentage (0.0 - 1.0)
    pub fn active_percentage(&self) -> f32 {
        let total = self.total_duration_ms();
        if total == 0 {
            return 0.0;
        }
        self.active_time_ms as f32 / total as f32
    }

    /// Get the primary language (most time spent)
    pub fn primary_language(&self) -> Option<String> {
        self.languages
            .iter()
            .max_by_key(|(_, time)| *time)
            .map(|(lang, _)| lang.clone())
        
    }

    fn update_activity_time(&mut self) {
        if self.state == SessionState::Active {
            let now = Utc::now();
            let delta = (now - self.last_activity).num_milliseconds() as u64;
            
            // Only count if activity is within reasonable bounds (< 5 seconds gap)
            if delta < 5000 {
                self.active_time_ms += delta;
            }
            
            self.last_activity = now;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_session() {
        let session = Session::new(1);
        assert_eq!(session.id, 1);
        assert_eq!(session.state, SessionState::Active);
        assert_eq!(session.keystroke_count, 0);
    }

    #[test]
    fn test_record_keystroke() {
        let mut session = Session::new(1);
        session.record_keystroke();
        assert_eq!(session.keystroke_count, 1);
    }

    #[test]
    fn test_idle_flow() {
        let mut session = Session::new(1);
        session.mark_idle();
        assert_eq!(session.state, SessionState::Idle);
        
        session.resume_from_idle();
        assert_eq!(session.state, SessionState::Active);
        assert_eq!(session.idle_periods.len(), 1);
    }

    #[test]
    fn test_session_end() {
        let mut session = Session::new(1);
        session.end();
        assert_eq!(session.state, SessionState::Ended);
        assert!(session.ended_at.is_some());
    }
}
