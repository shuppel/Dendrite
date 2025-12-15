use chrono::{Datelike, Duration, NaiveDate, Utc, Weekday, Timelike};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::storage::GrowthProfile;

/// Single cell in the activity heatmap
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeatmapCell {
    pub day: u8,          // 0-6, Monday-Sunday
    pub week: u8,         // Week offset from now
    pub hour: u8,         // 0-23
    pub intensity: f32,   // 0.0-1.0 normalized
    pub raw_minutes: u32,
}

/// Complete heatmap dataset
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeatmapData {
    pub cells: Vec<HeatmapCell>,
    pub max_minutes: u32,
    pub weeks: u8,
    pub total_minutes: u32,
}

/// Statistics for a single language
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageStat {
    pub language: String,
    pub time_ms: u64,
    pub files_count: u32,
    pub percentage: f32,
    pub color: String,
}

/// Generate a heatmap of activity over time
pub fn generate_heatmap(profile: &GrowthProfile, weeks: u8) -> HeatmapData {
    let mut cells = Vec::new();
    let today = Utc::now().date_naive();
    let start_date = today - Duration::weeks(weeks as i64);

    // Build a map of date -> total minutes
    let mut date_minutes: HashMap<NaiveDate, u32> = HashMap::new();
    for daily in &profile.daily_aggregates {
        if daily.date >= start_date && daily.date <= today {
            let minutes = (daily.total_time_ms / 1000 / 60) as u32;
            date_minutes.insert(daily.date, minutes);
        }
    }

    let max_minutes = *date_minutes.values().max().unwrap_or(&0);
    let total_minutes: u32 = date_minutes.values().sum();

    // Generate cells for each day/week
    for week in 0..weeks {
        for day in 0..7 {
            let offset_days = (weeks - week - 1) as i64 * 7 + day as i64;
            let date = today - Duration::days(offset_days);

            if date >= start_date {
                let raw_minutes = date_minutes.get(&date).copied().unwrap_or(0);
                let intensity = if max_minutes > 0 {
                    raw_minutes as f32 / max_minutes as f32
                } else {
                    0.0
                };

                cells.push(HeatmapCell {
                    day,
                    week,
                    hour: 0, // Not used for daily heatmap
                    intensity,
                    raw_minutes,
                });
            }
        }
    }

    HeatmapData {
        cells,
        max_minutes,
        weeks,
        total_minutes,
    }
}

/// Generate hourly distribution of activity (0-23 hours)
pub fn generate_hourly_distribution(profile: &GrowthProfile) -> HashMap<u8, u64> {
    let mut hourly: HashMap<u8, u64> = HashMap::new();

    for stored_session in &profile.sessions {
        let hour = stored_session.session.started_at.hour() as u8;
        *hourly.entry(hour).or_insert(0) += stored_session.session.active_time_ms;
    }

    hourly
}

/// Generate language breakdown statistics
pub fn generate_language_breakdown(profile: &GrowthProfile) -> Vec<LanguageStat> {
    let total_time: u64 = profile.lifetime_stats.languages.values().sum();
    
    if total_time == 0 {
        return Vec::new();
    }

    let mut stats: Vec<LanguageStat> = profile
        .lifetime_stats
        .languages
        .iter()
        .map(|(language, time_ms)| {
            let percentage = (*time_ms as f32 / total_time as f32) * 100.0;
            let color = get_language_color(language);

            LanguageStat {
                language: language.clone(),
                time_ms: *time_ms,
                files_count: 0, // TODO: Count from sessions
                percentage,
                color,
            }
        })
        .collect();

    // Sort by time (descending)
    stats.sort_by(|a, b| b.time_ms.cmp(&a.time_ms));

    stats
}

/// Get color for a language (matches CATS spec)
fn get_language_color(language: &str) -> String {
    match language.to_lowercase().as_str() {
        "typescript" => "#3178c6",
        "javascript" => "#f7df1e",
        "python" => "#3776ab",
        "rust" => "#dea584",
        "go" => "#00add8",
        "java" => "#b07219",
        "csharp" | "c#" => "#239120",
        "cpp" | "c++" => "#f34b7d",
        "ruby" => "#cc342d",
        "swift" => "#fa7343",
        "kotlin" => "#a97bff",
        _ => "#6e7681",
    }
    .to_string()
}

/// Get daily aggregates for the last N days
pub fn get_daily_aggregates(profile: &GrowthProfile, days: u32) -> Vec<&crate::storage::DailyAggregate> {
    let today = Utc::now().date_naive();
    let start_date = today - Duration::days(days as i64);

    profile
        .daily_aggregates
        .iter()
        .filter(|d| d.date >= start_date && d.date <= today)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session::Session;

    #[test]
    fn test_generate_heatmap() {
        let mut profile = GrowthProfile::new();
        let session = Session::new(1);
        profile.add_session(session);

        let heatmap = generate_heatmap(&profile, 12);
        assert_eq!(heatmap.weeks, 12);
        assert!(heatmap.cells.len() <= 12 * 7);
    }

    #[test]
    fn test_language_breakdown() {
        let mut profile = GrowthProfile::new();
        let mut session = Session::new(1);
        session.record_file_edit("test.rs".to_string(), "rust".to_string());
        session.record_file_edit("test.ts".to_string(), "typescript".to_string());
        profile.add_session(session);

        let breakdown = generate_language_breakdown(&profile);
        assert!(!breakdown.is_empty());
    }

    #[test]
    fn test_language_colors() {
        assert_eq!(get_language_color("rust"), "#dea584");
        assert_eq!(get_language_color("typescript"), "#3178c6");
        assert_eq!(get_language_color("unknown"), "#6e7681");
    }
}
