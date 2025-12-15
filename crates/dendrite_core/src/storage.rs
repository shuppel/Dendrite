use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use crate::session::Session;

/// Computed statistics for a session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStats {
    pub total_duration_ms: u64,
    pub active_percentage: f32,
    pub primary_language: Option<String>,
    pub commit_count: u32,
}

impl SessionStats {
    pub fn from_session(session: &Session) -> Self {
        Self {
            total_duration_ms: session.total_duration_ms(),
            active_percentage: session.active_percentage(),
            primary_language: session.primary_language(),
            commit_count: session.commits.len() as u32,
        }
    }
}

/// Persisted session data with computed statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredSession {
    pub session: Session,
    pub computed_stats: SessionStats,
}

impl StoredSession {
    pub fn new(session: Session) -> Self {
        let computed_stats = SessionStats::from_session(&session);
        Self {
            session,
            computed_stats,
        }
    }
}

/// Aggregated statistics for one day
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyAggregate {
    pub date: NaiveDate,
    pub total_time_ms: u64,
    pub total_keystrokes: u32,
    pub files_count: u32,
    pub sessions_count: u32,
    pub commits_count: u32,
    pub languages: HashMap<String, u64>,
}

impl DailyAggregate {
    pub fn new(date: NaiveDate) -> Self {
        Self {
            date,
            total_time_ms: 0,
            total_keystrokes: 0,
            files_count: 0,
            sessions_count: 0,
            commits_count: 0,
            languages: HashMap::new(),
        }
    }

    pub fn add_session(&mut self, session: &Session) {
        self.sessions_count += 1;
        self.total_time_ms += session.active_time_ms;
        self.total_keystrokes += session.keystroke_count;
        self.commits_count += session.commits.len() as u32;

        // Merge files
        let unique_files: std::collections::HashSet<_> = session.files_edited.iter().collect();
        self.files_count += unique_files.len() as u32;

        // Merge languages
        for (lang, time) in &session.languages {
            *self.languages.entry(lang.clone()).or_insert(0) += time;
        }
    }
}

/// All-time statistics for a user
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LifetimeStats {
    pub total_time_ms: u64,
    pub total_keystrokes: u64,
    pub total_sessions: u32,
    pub total_commits: u32,
    pub current_streak: u32,
    pub longest_streak: u32,
    pub languages: HashMap<String, u64>,
}

impl Default for LifetimeStats {
    fn default() -> Self {
        Self {
            total_time_ms: 0,
            total_keystrokes: 0,
            total_sessions: 0,
            total_commits: 0,
            current_streak: 0,
            longest_streak: 0,
            languages: HashMap::new(),
        }
    }
}

impl LifetimeStats {
    pub fn update_from_session(&mut self, session: &Session) {
        self.total_time_ms += session.active_time_ms;
        self.total_keystrokes += session.keystroke_count as u64;
        self.total_sessions += 1;
        self.total_commits += session.commits.len() as u32;

        // Merge languages
        for (lang, time) in &session.languages {
            *self.languages.entry(lang.clone()).or_insert(0) += time;
        }
    }

    pub fn recalculate_streaks(&mut self, daily_aggregates: &[DailyAggregate]) {
        if daily_aggregates.is_empty() {
            self.current_streak = 0;
            self.longest_streak = 0;
            return;
        }

        let mut sorted_dates: Vec<_> = daily_aggregates.iter().map(|d| d.date).collect();
        sorted_dates.sort();

        let today = Utc::now().date_naive();
        let mut current_streak = 0;
        let mut longest_streak = 0;
        let mut temp_streak = 1;

        // Calculate current streak (must include today or yesterday)
        if let Some(&last_date) = sorted_dates.last() {
            let days_since = (today - last_date).num_days();
            if days_since <= 1 {
                current_streak = 1;
                for i in (0..sorted_dates.len() - 1).rev() {
                    let diff = (sorted_dates[i + 1] - sorted_dates[i]).num_days();
                    if diff == 1 {
                        current_streak += 1;
                    } else {
                        break;
                    }
                }
            }
        }

        // Calculate longest streak
        for i in 1..sorted_dates.len() {
            let diff = (sorted_dates[i] - sorted_dates[i - 1]).num_days();
            if diff == 1 {
                temp_streak += 1;
                longest_streak = longest_streak.max(temp_streak);
            } else {
                temp_streak = 1;
            }
        }
        longest_streak = longest_streak.max(temp_streak);

        self.current_streak = current_streak;
        self.longest_streak = longest_streak;
    }
}

/// Complete user learning profile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrowthProfile {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub sessions: Vec<StoredSession>,
    pub daily_aggregates: Vec<DailyAggregate>,
    pub lifetime_stats: LifetimeStats,
}

impl GrowthProfile {
    pub fn new() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            created_at: Utc::now(),
            sessions: Vec::new(),
            daily_aggregates: Vec::new(),
            lifetime_stats: LifetimeStats::default(),
        }
    }

    pub fn add_session(&mut self, session: Session) {
        // Create stored session
        let stored_session = StoredSession::new(session.clone());

        // Update lifetime stats
        self.lifetime_stats.update_from_session(&session);

        // Update or create daily aggregate
        let session_date = session.started_at.date_naive();
        if let Some(daily) = self.daily_aggregates.iter_mut().find(|d| d.date == session_date) {
            daily.add_session(&session);
        } else {
            let mut daily = DailyAggregate::new(session_date);
            daily.add_session(&session);
            self.daily_aggregates.push(daily);
        }

        // Recalculate streaks
        self.lifetime_stats.recalculate_streaks(&self.daily_aggregates);

        // Add session
        self.sessions.push(stored_session);
    }

    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }
}

impl Default for GrowthProfile {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session::Session;

    #[test]
    fn test_new_profile() {
        let profile = GrowthProfile::new();
        assert!(!profile.id.is_empty());
        assert_eq!(profile.sessions.len(), 0);
        assert_eq!(profile.lifetime_stats.total_sessions, 0);
    }

    #[test]
    fn test_add_session() {
        let mut profile = GrowthProfile::new();
        let session = Session::new(1);
        profile.add_session(session);
        
        assert_eq!(profile.sessions.len(), 1);
        assert_eq!(profile.lifetime_stats.total_sessions, 1);
        assert_eq!(profile.daily_aggregates.len(), 1);
    }

    #[test]
    fn test_json_serialization() {
        let profile = GrowthProfile::new();
        let json = profile.to_json().unwrap();
        let deserialized = GrowthProfile::from_json(&json).unwrap();
        assert_eq!(profile.id, deserialized.id);
    }
}
