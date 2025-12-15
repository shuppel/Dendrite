
export const DENDRITE_VIEW_CONTAINER_ID = 'growth';
export const DENDRITE_DASHBOARD_VIEW_ID = 'dendrite.dashboard';

export const StorageKeys = {
    PROFILE: 'dendrite.profile',
    ACTIVE_SESSION: 'dendrite.activeSession'
};

export const CommandIds = {
    PAUSE_SESSION: 'dendrite.pauseSession',
    RESUME_SESSION: 'dendrite.resumeSession',
    EXPORT_PORTFOLIO: 'dendrite.exportPortfolio',
    COPY_BADGE: 'dendrite.copyBadge',
    OPEN_GROWTH: 'dendrite.openGrowth',
    SHOW_STATS: 'dendrite.showStats'
};

export const ConfigKeys = {
    ENABLED: 'dendrite.enabled',
    IDLE_THRESHOLD: 'dendrite.idleThresholdMs',
    AUTO_START: 'dendrite.autoStart',
    TRACK_GIT: 'dendrite.trackGit',
    HEATMAP_WEEKS: 'dendrite.heatmapWeeks',
    SHOW_STREAK_NOTIFICATION: 'dendrite.showStreakNotification'
};

export const DefaultLanguageColors: Record<string, string> = {
    typescript: "#3178c6",
    javascript: "#f7df1e",
    python: "#3776ab",
    rust: "#dea584",
    go: "#00add8",
    java: "#b07219",
    csharp: "#239120",
    cpp: "#f34b7d",
    ruby: "#cc342d",
    swift: "#fa7343",
    kotlin: "#a97bff",
    other: "#6e7681"
};
