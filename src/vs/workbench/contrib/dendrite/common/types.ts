
export interface Session {
    id: number; // u64 in Rust becomes number (or bigint, but number usually safe for IDs if not huge) or string if serialized
    started_at: string; // DateTime<Utc>
    ended_at: string | null;
    active_time_ms: number; // u64
    keystroke_count: number; // u32
    files_edited: string[];
    languages: Record<string, number>;
    idle_periods: IdlePeriod[];
    commits: CommitRef[];
}

export interface IdlePeriod {
    started_at: string;
    ended_at: string | null;
    duration_ms: number;
}

export interface CommitRef {
    hash: string;
    short_hash: string;
    message: string;
    timestamp: string;
    files_changed: string[];
}

export interface StoredSession {
    session: Session;
    computed_stats: SessionStats;
}

export interface SessionStats {
    total_duration_ms: number;
    active_percentage: number; // f32
    primary_language: string | null;
    commit_count: number;
}

export interface DailyAggregate {
    date: string; // NaiveDate
    total_time_ms: number;
    total_keystrokes: number;
    files_count: number;
    sessions_count: number;
    commits_count: number;
    languages: Record<string, number>;
}

export interface LifetimeStats {
    total_time_ms: number;
    total_keystrokes: number;
    total_sessions: number;
    total_commits: number;
    current_streak: number;
    longest_streak: number;
    languages: Record<string, number>;
}

export interface GrowthProfile {
    id: string;
    created_at: string;
    sessions: StoredSession[];
    daily_aggregates: DailyAggregate[];
    lifetime_stats: LifetimeStats;
}

export interface HeatmapCell {
    day: number;
    week: number;
    hour: number;
    intensity: number;
    raw_minutes: number;
}

export interface HeatmapData {
    cells: HeatmapCell[];
    max_minutes: number;
    weeks: number;
    total_minutes: number;
}

export interface LanguageStat {
    language: string;
    time_ms: number;
    files_count: number;
    percentage: number;
    color: string;
}

export enum SessionState {
    ACTIVE = 'active',
    IDLE = 'idle',
    PAUSED = 'paused',
    ENDED = 'ended'
}

export enum ExportFormat {
    JSON = 'json',
    MARKDOWN = 'markdown',
    SVG_HEATMAP = 'svg_heatmap',
    BADGE_SVG = 'badge_svg',
    BADGE_URL = 'badge_url'
}

export interface ExportOptions {
    format: ExportFormat;
    date_range?: [string, string];
    include_commits: boolean;
    include_files: boolean;
}

// Opaque handle for the Rust session
export type SessionHandle = number;
