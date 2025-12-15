use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

pub use crate::session::CommitRef;
use crate::storage::GrowthProfile;

/// Correlation between a commit and the session(s) it was made in
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitCorrelation {
    pub commit: CommitRef,
    pub session_id: u64,
    pub session_duration_ms: u64,
    pub files_in_common: Vec<String>,
}

/// Get all commit correlations from a profile
pub fn get_commit_correlations(profile: &GrowthProfile) -> Vec<CommitCorrelation> {
    let mut correlations = Vec::new();

    for stored_session in &profile.sessions {
        let session = &stored_session.session;
        
        for commit in &session.commits {
            // Find files in common between session and commit
            let files_in_common: Vec<String> = session
                .files_edited
                .iter()
                .filter(|f| commit.files_changed.contains(f))
                .cloned()
                .collect();

            correlations.push(CommitCorrelation {
                commit: commit.clone(),
                session_id: session.id,
                session_duration_ms: session.total_duration_ms(),
                files_in_common,
            });
        }
    }

    correlations
}

/// Parse a commit from JSON string
pub fn parse_commit_json(json: &str) -> Result<CommitRef, serde_json::Error> {
    serde_json::from_str(json)
}

/// Create a commit reference from components
pub fn create_commit_ref(
    hash: String,
    message: String,
    timestamp: DateTime<Utc>,
    files_changed: Vec<String>,
) -> CommitRef {
    CommitRef::new(hash, message, timestamp, files_changed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session::Session;

    #[test]
    fn test_create_commit_ref() {
        let commit = create_commit_ref(
            "abcdef1234567890".to_string(),
            "Initial commit".to_string(),
            Utc::now(),
            vec!["src/main.rs".to_string()],
        );
        
        assert_eq!(commit.hash, "abcdef1234567890");
        assert_eq!(commit.short_hash, "abcdef1");
        assert_eq!(commit.message, "Initial commit");
    }

    #[test]
    fn test_commit_correlations() {
        let mut profile = crate::storage::GrowthProfile::new();
        let mut session = Session::new(1);
        
        session.record_file_edit("src/main.rs".to_string(), "rust".to_string());
        
        let commit = create_commit_ref(
            "abc123".to_string(),
            "Test".to_string(),
            Utc::now(),
            vec!["src/main.rs".to_string()],
        );
        
        session.add_commit(commit);
        profile.add_session(session);
        
        let correlations = get_commit_correlations(&profile);
        assert_eq!(correlations.len(), 1);
        assert_eq!(correlations[0].files_in_common.len(), 1);
    }
}
