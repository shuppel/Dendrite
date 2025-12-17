/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


export const DENDRITE_VIEW_CONTAINER_ID = 'growth';
export const DENDRITE_DASHBOARD_VIEW_ID = 'dendrite.dashboard';

export const StorageKeys = {
    PROFILE: 'dendrite.profile',
    ACTIVE_SESSION: 'dendrite.activeSession'
};

export const CommandIds = {
    // Session commands
    START_SESSION: 'dendrite.startSession',
    PAUSE_SESSION: 'dendrite.pauseSession',
    RESUME_SESSION: 'dendrite.resumeSession',
    END_SESSION: 'dendrite.endSession',
    TOGGLE_SESSION: 'dendrite.toggleSession',
    
    // Export commands
    EXPORT_PORTFOLIO: 'dendrite.exportPortfolio',
    EXPORT_JSON: 'dendrite.exportJson',
    EXPORT_MARKDOWN: 'dendrite.exportMarkdown',
    EXPORT_HEATMAP_SVG: 'dendrite.exportHeatmapSvg',
    
    // Badge commands
    COPY_BADGE: 'dendrite.copyBadge',
    COPY_BADGE_URL: 'dendrite.copyBadgeUrl',
    COPY_BADGE_SVG: 'dendrite.copyBadgeSvg',
    
    // View commands
    OPEN_GROWTH: 'dendrite.openGrowth',
    SHOW_STATS: 'dendrite.showStats',
    REFRESH_DASHBOARD: 'dendrite.refreshDashboard'
};

export const ConfigKeys = {
    ENABLED: 'dendrite.enabled',
    IDLE_THRESHOLD: 'dendrite.idleThresholdMs',
    AUTO_START: 'dendrite.autoStart',
    TRACK_GIT: 'dendrite.trackGit',
    HEATMAP_WEEKS: 'dendrite.heatmapWeeks',
    SHOW_STREAK_NOTIFICATION: 'dendrite.showStreakNotification',

    // Terminal Velocity (Era 4)
    TERMINAL_SMOOTH_CURSOR: 'dendrite.terminal.smoothCursor',
    TERMINAL_CURSOR_PHYSICS: 'dendrite.terminal.cursorPhysics',
    TERMINAL_FORCE_GPU: 'dendrite.terminal.forceGPU',
    TERMINAL_TARGET_FPS: 'dendrite.terminal.targetFPS'
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
