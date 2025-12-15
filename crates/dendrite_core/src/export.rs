use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::storage::GrowthProfile;
use crate::visualization::{generate_heatmap, generate_language_breakdown};

/// Export format options
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExportFormat {
    Json,
    Markdown,
    SvgHeatmap,
    BadgeSvg,
    BadgeUrl,
}

/// Configuration for portfolio export
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    pub format: ExportFormat,
    pub date_range: Option<(DateTime<Utc>, DateTime<Utc>)>,
    pub include_commits: bool,
    pub include_files: bool,
}

impl Default for ExportOptions {
    fn default() -> Self {
        Self {
            format: ExportFormat::Json,
            date_range: None,
            include_commits: true,
            include_files: true,
        }
    }
}

/// Export profile as JSON
pub fn export_json(profile: &GrowthProfile, options: &ExportOptions) -> Result<String, serde_json::Error> {
    if options.date_range.is_some() || !options.include_commits || !options.include_files {
        // Create a filtered copy
        let mut filtered = profile.clone();
        
        if let Some((start, end)) = options.date_range {
            filtered.sessions.retain(|s| {
                s.session.started_at >= start && s.session.started_at <= end
            });
        }

        if !options.include_commits {
            for stored_session in &mut filtered.sessions {
                stored_session.session.commits.clear();
            }
        }

        if !options.include_files {
            for stored_session in &mut filtered.sessions {
                stored_session.session.files_edited.clear();
            }
        }

        serde_json::to_string_pretty(&filtered)
    } else {
        serde_json::to_string_pretty(profile)
    }
}

/// Export profile as Markdown report
pub fn export_markdown(profile: &GrowthProfile, _options: &ExportOptions) -> String {
    let mut md = String::new();
    
    md.push_str("# Learning Growth Report\n\n");
    md.push_str(&format!("**Profile ID:** `{}`\n", profile.id));
    md.push_str(&format!("**Created:** {}\n\n", profile.created_at.format("%Y-%m-%d %H:%M:%S UTC")));
    
    md.push_str("## Lifetime Statistics\n\n");
    let hours = profile.lifetime_stats.total_time_ms / 1000 / 3600;
    let minutes = (profile.lifetime_stats.total_time_ms / 1000 / 60) % 60;
    md.push_str(&format!("- **Total Active Time:** {}h {}m\n", hours, minutes));
    md.push_str(&format!("- **Total Sessions:** {}\n", profile.lifetime_stats.total_sessions));
    md.push_str(&format!("- **Total Keystrokes:** {}\n", profile.lifetime_stats.total_keystrokes));
    md.push_str(&format!("- **Total Commits:** {}\n", profile.lifetime_stats.total_commits));
    md.push_str(&format!("- **Current Streak:** {} days\n", profile.lifetime_stats.current_streak));
    md.push_str(&format!("- **Longest Streak:** {} days\n\n", profile.lifetime_stats.longest_streak));
    
    md.push_str("## Language Breakdown\n\n");
    let languages = generate_language_breakdown(profile);
    for lang in &languages {
        let hours = lang.time_ms / 1000 / 3600;
        md.push_str(&format!("- **{}**: {}h ({:.1}%)\n", lang.language, hours, lang.percentage));
    }
    
    md.push_str("\n## Recent Activity\n\n");
    md.push_str(&format!("Total sessions recorded: {}\n", profile.sessions.len()));
    
    if let Some(last_session) = profile.sessions.last() {
        md.push_str(&format!("\nLast session: {}\n", last_session.session.started_at.format("%Y-%m-%d %H:%M:%S UTC")));
    }
    
    md
}

/// Generate SVG heatmap
pub fn export_heatmap_svg(profile: &GrowthProfile, weeks: u8) -> String {
    let heatmap = generate_heatmap(profile, weeks);
    let cell_size = 12;
    let cell_gap = 2;
    let width = weeks as usize * (cell_size + cell_gap) + 40;
    let height = 7 * (cell_size + cell_gap) + 40;

    let mut svg = format!(
        "<svg width=\"{}\" height=\"{}\" xmlns=\"http://www.w3.org/2000/svg\">",
        width, height
    );

    svg.push_str("<rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>");

    // Draw cells
    for cell in &heatmap.cells {
        let x = 20 + (weeks - cell.week - 1) as usize * (cell_size + cell_gap);
        let y = 20 + cell.day as usize * (cell_size + cell_gap);
        let color = intensity_to_color(cell.intensity);

        svg.push_str(&format!(
            "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"{}\" rx=\"2\"/>",
            x, y, cell_size, cell_size, color
        ));
    }

    svg.push_str("</svg>");
    svg
}

/// Generate a badge SVG showing streak
pub fn generate_badge_svg(profile: &GrowthProfile) -> String {
    let streak = profile.lifetime_stats.current_streak;
    let label = "streak";
    let value = format!("{} days", streak);

    // Simple shields.io-style badge
    format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"20\">\n\
          <linearGradient id=\"b\" x2=\"0\" y2=\"100%\">\n\
            <stop offset=\"0\" stop-color=\"#bbb\" stop-opacity=\".1\"/>\n\
            <stop offset=\"1\" stop-opacity=\".1\"/>\n\
          </linearGradient>\n\
          <rect rx=\"3\" width=\"120\" height=\"20\" fill=\"#555\"/>\n\
          <rect rx=\"3\" x=\"50\" width=\"70\" height=\"20\" fill=\"#4c1\"/>\n\
          <path fill=\"#4c1\" d=\"M50 0h4v20h-4z\"/>\n\
          <rect rx=\"3\" width=\"120\" height=\"20\" fill=\"url(#b)\"/>\n\
          <g fill=\"#fff\" text-anchor=\"middle\" font-family=\"DejaVu Sans,Verdana,Geneva,sans-serif\" font-size=\"11\">\n\
            <text x=\"25\" y=\"15\" fill=\"#010101\" fill-opacity=\".3\">{}</text>\n\
            <text x=\"25\" y=\"14\">{}</text>\n\
            <text x=\"85\" y=\"15\" fill=\"#010101\" fill-opacity=\".3\">{}</text>\n\
            <text x=\"85\" y=\"14\">{}</text>\n\
          </g>\n\
        </svg>",
        label, label, value, value
    )
}

/// Generate a shields.io badge URL
pub fn generate_badge_url(profile: &GrowthProfile) -> String {
    let streak = profile.lifetime_stats.current_streak;
    format!(
        "https://img.shields.io/badge/streak-{}_days-brightgreen",
        streak
    )
}

fn intensity_to_color(intensity: f32) -> String {
    if intensity == 0.0 {
        "#ebedf0".to_string()
    } else if intensity < 0.25 {
        "#9be9a8".to_string()
    } else if intensity < 0.5 {
        "#40c463".to_string()
    } else if intensity < 0.75 {
        "#30a14e".to_string()
    } else {
        "#216e39".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_json() {
        let profile = GrowthProfile::new();
        let options = ExportOptions::default();
        let json = export_json(&profile, &options).unwrap();
        assert!(json.contains(&profile.id));
    }

    #[test]
    fn test_export_markdown() {
        let profile = GrowthProfile::new();
        let options = ExportOptions::default();
        let md = export_markdown(&profile, &options);
        assert!(md.contains("Learning Growth Report"));
        assert!(md.contains(&profile.id));
    }

    #[test]
    fn test_generate_badge_url() {
        let profile = GrowthProfile::new();
        let url = generate_badge_url(&profile);
        assert!(url.starts_with("https://img.shields.io"));
    }

    #[test]
    fn test_intensity_to_color() {
        assert_eq!(intensity_to_color(0.0), "#ebedf0");
        assert_eq!(intensity_to_color(0.2), "#9be9a8");
        assert_eq!(intensity_to_color(0.4), "#40c463");
        assert_eq!(intensity_to_color(0.6), "#30a14e");
        assert_eq!(intensity_to_color(0.9), "#216e39");
    }
}
