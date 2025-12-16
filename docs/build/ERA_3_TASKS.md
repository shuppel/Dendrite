# Era 3: UI Implementation and Polish - Detailed Task Breakdown

**Status**: Not Started  
**Total Tasks**: 27  
**Estimated Duration**: 2-3 weeks (for single developer)  
**Dependencies**: Era 1 and Era 2 must be complete

---

## Overview

Era 3 completes the Dendrite IDE by implementing all user-facing features, including visualization renderers, command handlers, settings configuration, and dashboard UI components.

### 8 Implementation Phases

1. **Renderer Infrastructure** (5 tasks) - Visualization components
2. **Command Handlers** (5 tasks) - User interaction commands
3. **Settings & Configuration** (3 tasks) - Settings registration and listeners
4. **Dashboard UI Components** (6 tasks) - Complete dashboard sections
5. **Status Bar Integration** (1 task) - Session status display
6. **VS Code Mutations** (4 tasks) - File modifications
7. **Build Integration** (1 task) - Automatic WASM compilation
8. **Testing & Polish** (2 tasks) - QA and documentation

---

## Phase 1: Renderer Infrastructure (5 Tasks)

### Task 3.1: Create Renderers Directory Structure
**Status**: Not Started  
**Depends On**: None  
**Estimated Time**: 15 minutes

**Implementation**:
```bash
mkdir -p src/vs/workbench/contrib/dendrite/browser/renderers
touch src/vs/workbench/contrib/dendrite/browser/renderers/.gitkeep
```

**Validation**:
- [ ] Directory exists at correct path
- [ ] Can be imported from TypeScript

---

### Task 3.2: Implement Heatmap Renderer
**Status**: Not Started  
**Depends On**: 3.1  
**Estimated Time**: 4-6 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/renderers/heatmapRenderer.ts`

**Requirements**:
- Renders HeatmapData from WASM `generate_heatmap(profile, weeks)` as GitHub-style grid
- SVG or Canvas based visualization
- 12 weeks by default (configurable via `dendrite.heatmapWeeks`)
- Interactive hover tooltips showing date and duration
- Color intensity based on activity level (0.0-1.0)

**Key Functions**:
```typescript
export class HeatmapRenderer {
    constructor(
        private container: HTMLElement,
        private wasmBridge: WasmBridge
    ) {}
    
    public async render(profileJson: string, weeks?: number): Promise<void> {
        const heatmapData = this.wasmBridge.generateHeatmap(profileJson, weeks ?? 12);
        this.renderGrid(heatmapData);
    }
    
    private renderGrid(data: HeatmapData): void {
        // Create SVG/Canvas grid
        // Handle cell coloring based on intensity
        // Add hover tooltips
    }
}
```

**Validation**:
- [ ] Renders 12 weeks by default
- [ ] Updates when `dendrite.heatmapWeeks` changes
- [ ] Handles empty data (shows blank grid)
- [ ] Tooltips show: date, duration in minutes
- [ ] Color intensity scales correctly (light to dark)

---

### Task 3.3: Implement Language Chart Renderer
**Status**: Not Started  
**Depends On**: 3.1  
**Estimated Time**: 3-4 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/renderers/languageChartRenderer.ts`

**Requirements**:
- Renders `Vec<LanguageStat>` from WASM as pie or bar chart
- Uses language colors from constants (task 3.13)
- Shows percentage and time for each language
- Groups languages beyond top N as "Other"

**Key Functions**:
```typescript
export class LanguageChartRenderer {
    public async render(profileJson: string): Promise<void> {
        const languageStats = this.wasmBridge.generateLanguageBreakdown(profileJson);
        this.renderChart(languageStats);
    }
    
    private renderChart(stats: LanguageStat[]): void {
        // Create pie or bar chart
        // Apply language colors from constants
        // Show percentages
    }
}
```

**Validation**:
- [ ] Colors match CATS specification exactly
- [ ] Percentages sum to 100%
- [ ] Shows top 5-10 languages, groups rest as "Other"
- [ ] Handles single language gracefully
- [ ] Handles 10+ languages without clutter

---

### Task 3.4: Implement Streak Renderer
**Status**: Not Started  
**Depends On**: 3.1  
**Estimated Time**: 2-3 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/renderers/streakRenderer.ts`

**Requirements**:
- Displays current_streak and longest_streak from LifetimeStats
- Visual flame/fire icon with count
- Shows notification when streak increases (if setting enabled)
- Updates at midnight on new day

**Key Functions**:
```typescript
export class StreakRenderer {
    public async render(profileJson: string): Promise<void> {
        const current = this.wasmBridge.getCurrentStreak(profileJson);
        const longest = this.wasmBridge.getLongestStreak(profileJson);
        this.renderStreak(current, longest);
    }
    
    private showStreakNotification(newStreak: number): void {
        if (this.configService.getValue(ConfigKeys.SHOW_STREAK_NOTIFICATION)) {
            // Show notification
        }
    }
}
```

**Validation**:
- [ ] Displays both current and longest streak
- [ ] Visual indicator scales with streak length
- [ ] Notification appears when enabled in settings
- [ ] Shows "0 days" gracefully when no activity

---

### Task 3.5: Implement Commit Timeline Renderer
**Status**: Not Started  
**Depends On**: 3.1  
**Estimated Time**: 3-4 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/renderers/commitTimelineRenderer.ts`

**Requirements**:
- Renders commit timeline from `get_commit_correlations(profile)`
- Shows commit hash (short), message, timestamp
- Links commit to session that included it
- Chronological order (newest first)

**Key Functions**:
```typescript
export class CommitTimelineRenderer {
    public async render(profileJson: string): Promise<void> {
        const correlationsJson = this.wasmBridge.getCommitCorrelations(profileJson);
        const correlations = JSON.parse(correlationsJson);
        this.renderTimeline(correlations);
    }
    
    private renderTimeline(commits: any[]): void {
        // Create timeline visualization
        // Show commit details
        // Link to session
    }
}
```

**Validation**:
- [ ] Timeline shows chronological order
- [ ] Clicking commit shows session details
- [ ] Handles repos with no commits
- [ ] Shows files changed count
- [ ] Updates when new commits added

---

## Phase 2: Command Handlers (5 Tasks)

### Task 3.6: Create Commands Directory Structure
**Status**: Not Started  
**Estimated Time**: 5 minutes

**Implementation**:
```bash
mkdir -p src/vs/workbench/contrib/dendrite/browser/commands
```

---

### Task 3.7: Implement Export Command
**Status**: Not Started  
**Depends On**: 3.6  
**Estimated Time**: 3-4 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/commands/exportCommand.ts`

**Requirements**:
- Command ID: `dendrite.exportPortfolio`
- Quick pick for format selection: JSON, Markdown, SVG Heatmap, Badge SVG, Badge URL
- File save dialog for file formats
- Clipboard copy for URL formats
- Success notification

**WASM Functions Used**:
- `export_json(profile, options)`
- `export_markdown(profile, options)`
- `export_heatmap_svg(profile, weeks)`
- `generate_badge_svg(profile)`
- `generate_badge_url(profile)`

**Validation**:
- [ ] All 5 export formats work
- [ ] File saves to user-chosen location
- [ ] JSON and Markdown are syntactically valid
- [ ] SVG renders correctly in browser
- [ ] Badge URL is accessible

---

### Task 3.8: Implement Badge Command
**Status**: Not Started  
**Depends On**: 3.6  
**Estimated Time**: 1-2 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/commands/badgeCommand.ts`

**Requirements**:
- Command ID: `dendrite.copyBadge`
- Generates badge SVG or URL
- Formats as markdown: `![Dendrite](url)`
- Copies to clipboard
- Shows success notification

**Validation**:
- [ ] Badge markdown is valid
- [ ] Clipboard receives correct text
- [ ] Badge displays current stats
- [ ] Works in GitHub markdown

---

### Task 3.9: Implement Session Control Commands
**Status**: Not Started  
**Depends On**: 3.6  
**Estimated Time**: 2-3 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/commands/sessionCommands.ts`

**Commands to Implement**:
1. `dendrite.pauseSession` - Calls `sessionLifecycleService.pauseSession()`
2. `dendrite.resumeSession` - Calls `sessionLifecycleService.resumeSession()`
3. `dendrite.showStats` - Shows notification with today's stats
4. `dendrite.openGrowth` - Focuses Growth view container

**Validation**:
- [ ] Pause/resume changes session state
- [ ] Stats notification shows: time, keystrokes, files, languages
- [ ] OpenGrowth focuses sidebar and Growth view
- [ ] Commands respect `dendrite.enabled` setting

---

### Task 3.10: Register All Commands
**Status**: Not Started  
**Depends On**: 3.7, 3.8, 3.9  
**Estimated Time**: 1 hour

**File**: `src/vs/workbench/contrib/dendrite/browser/dendrite.contribution.ts`

**Implementation**:
```typescript
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { KeybindingsRegistry } from 'vs/platform/keybinding/common/keybindingsRegistry';

// Register all 6 commands
CommandsRegistry.registerCommand({
    id: CommandIds.EXPORT_PORTFOLIO,
    handler: (accessor) => { /* ... */ }
});

// Register keybinding for openGrowth
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: CommandIds.OPEN_GROWTH,
    primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyG,
    handler: (accessor) => { /* ... */ }
});
```

**Validation**:
- [ ] All 6 commands appear in command palette
- [ ] Titles match CATS specification
- [ ] `ctrl+shift+g` works for openGrowth
- [ ] Commands enabled/disabled appropriately

---

## Phase 3: Settings & Configuration (3 Tasks)

### Task 3.11: Register Settings Schema
**Status**: Not Started  
**Estimated Time**: 1-2 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/dendrite.contribution.ts`

**Settings to Register**:
1. `dendrite.enabled` (boolean, default: true)
2. `dendrite.idleThresholdMs` (number, default: 300000)
3. `dendrite.autoStart` (boolean, default: true)
4. `dendrite.trackGit` (boolean, default: true)
5. `dendrite.heatmapWeeks` (number, default: 12)
6. `dendrite.showStreakNotification` (boolean, default: true)

**Implementation**:
```typescript
configurationRegistry.registerConfiguration({
    id: 'dendrite',
    order: 100,
    title: 'Dendrite',
    type: 'object',
    properties: {
        'dendrite.enabled': {
            type: 'boolean',
            default: true,
            description: 'Enable Dendrite session tracking'
        },
        // ... all 6 settings
    }
});
```

**Validation**:
- [ ] All 6 settings appear in Settings UI
- [ ] Settings under 'Dendrite' category
- [ ] Defaults match CATS exactly
- [ ] Type validation prevents invalid values

---

### Task 3.12: Implement Settings Change Listeners
**Status**: Not Started  
**Depends On**: 3.11  
**Estimated Time**: 2-3 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/settingsService.ts`

**Requirements**:
- Listen to `IConfigurationService` changes
- Update services when settings change:
  - `enabled` → pause/resume sessionLifecycleService
  - `idleThresholdMs` → update threshold
  - `autoStart` → affect session start behavior
  - `trackGit` → enable/disable gitIntegrationService
  - `heatmapWeeks` → refresh heatmap renderer
  - `showStreakNotification` → control notifications

**Implementation**:
```typescript
export class DendriteSettingsService extends Disposable {
    constructor(
        @IConfigurationService private readonly configService: IConfigurationService,
        private readonly sessionLifecycle: DendriteSessionLifecycleService,
        // ... other services
    ) {
        super();
        this._register(configService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ConfigKeys.ENABLED)) {
                this.handleEnabledChange();
            }
            // ... handle other settings
        }));
    }
}
```

**Validation**:
- [ ] Changing `enabled` immediately pauses/resumes
- [ ] Changing `idleThresholdMs` updates idle detection
- [ ] Changing `trackGit` starts/stops git watcher
- [ ] Changing `heatmapWeeks` re-renders heatmap
- [ ] All changes effective without restart

---

### Task 3.13: Define Language Color Constants
**Status**: Not Started  
**Estimated Time**: 30 minutes

**File**: `src/vs/workbench/contrib/dendrite/common/constants.ts`

**Implementation**:
```typescript
export const LANGUAGE_COLORS: Record<string, string> = {
    typescript: '#3178c6',
    javascript: '#f7df1e',
    python: '#3776ab',
    rust: '#dea584',
    go: '#00add8',
    java: '#b07219',
    csharp: '#239120',
    cpp: '#f34b7d',
    ruby: '#cc342d',
    swift: '#fa7343',
    kotlin: '#a97bff',
    other: '#6e7681'
};
```

**Validation**:
- [ ] Colors match CATS exactly
- [ ] Used by languageChartRenderer
- [ ] Fallback to 'other' for unknown languages

---

## Phase 4: Dashboard UI Components (6 Tasks)

### Task 3.14: Implement Header Section
**Status**: Not Started  
**Depends On**: 3.7  
**Estimated Time**: 2-3 hours

**Component**: Dashboard header with session indicator and export button

**Validation**:
- [ ] Shows ACTIVE/IDLE/PAUSED/ENDED state with icon
- [ ] Export button triggers `dendrite.exportPortfolio`
- [ ] Updates in real-time on state change

---

### Task 3.15: Implement Streak Section
**Status**: Not Started  
**Depends On**: 3.4  
**Estimated Time**: 1-2 hours

**Component**: Streak display using StreakRenderer

**Validation**:
- [ ] Shows current and longest streak side-by-side
- [ ] Visual flame icon
- [ ] Updates at midnight

---

### Task 3.16: Implement Today Stats Section
**Status**: Not Started  
**Estimated Time**: 2-3 hours

**Component**: Today's statistics

**Display**:
- Active time (formatted: "2h 34m")
- Keystroke count
- Files edited count
- Languages used (top 3)

**Validation**:
- [ ] Updates in real-time during session
- [ ] Time formats correctly
- [ ] Resets at midnight
- [ ] Shows 0/empty gracefully

---

### Task 3.17: Implement Heatmap Section
**Status**: Not Started  
**Depends On**: 3.2, 3.12  
**Estimated Time**: 1-2 hours

**Component**: Activity heatmap using HeatmapRenderer

**Validation**:
- [ ] Respects `dendrite.heatmapWeeks` setting
- [ ] Tooltips work on hover
- [ ] Updates when data changes

---

### Task 3.18: Implement Languages Section
**Status**: Not Started  
**Depends On**: 3.3, 3.13  
**Estimated Time**: 1-2 hours

**Component**: Language breakdown using LanguageChartRenderer

**Validation**:
- [ ] Uses correct colors
- [ ] Shows percentages
- [ ] Updates when language usage changes

---

### Task 3.19: Implement Git Timeline Tab
**Status**: Not Started  
**Depends On**: 3.5  
**Estimated Time**: 2-3 hours

**Component**: Git section with tab navigation and CommitTimelineRenderer

**Validation**:
- [ ] Tab switches correctly
- [ ] Timeline renders in tab
- [ ] Hidden when `dendrite.trackGit` disabled
- [ ] Badge shows commit count

---

## Phase 5: Status Bar Integration (1 Task)

### Task 3.20: Implement Status Bar Item
**Status**: Not Started  
**Depends On**: 3.9  
**Estimated Time**: 2-3 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/statusBarService.ts`

**Requirements**:
- ID: `dendrite.sessionStatus`
- Alignment: StatusbarAlignment.RIGHT
- Priority: 100
- Shows session state icon and active time
- Tooltip: "Dendrite: Click for stats"
- onClick: `dendrite.showStats`

**Validation**:
- [ ] Appears on right side of status bar
- [ ] Shows correct state icon
- [ ] Active time updates every second
- [ ] Clicking shows stats notification
- [ ] Tooltip works on hover

---

## Phase 6: VS Code Mutations (4 Tasks)

### Task 3.21: Verify product.json Mutations
**Status**: Not Started  
**Estimated Time**: 30 minutes

Most mutations completed in Era 2. Verify and complete remaining:

**Completed** (Era 2):
- ✅ Removed `extensionsGallery`
- ✅ Removed badge providers
- ✅ Removed AIF-* keys
- ✅ Added `dendrite.enabled: true`

**Pending**:
- [ ] Remove `aiKey` (if exists)
- [ ] Remove `msftInternalDomains` (if exists)
- [ ] Remove `sendASmile` (if exists)

---

### Task 3.22: Verify Extensions View Commented Out
**Status**: Not Started  
**Estimated Time**: 15 minutes

**File**: `src/vs/workbench/contrib/extensions/browser/extensions.contribution.ts`

Verify ViewContainer registration is commented with:
```typescript
// DENDRITE: Disabled - replaced by Growth view
```

---

### Task 3.23: Verify Dendrite Import (Completed in Era 2)
**Status**: ✅ Completed  
**File**: `src/vs/workbench/workbench.common.main.ts`

Just verify line exists:
```typescript
import 'vs/workbench/contrib/dendrite/browser/dendrite.contribution';
```

---

### Task 3.24: Verify Telemetry Disabled (Completed in Era 2)
**Status**: ✅ Completed  
**File**: `src/vs/platform/telemetry/common/telemetryService.ts`

Just verify telemetry is disabled or using NullTelemetryService.

---

## Phase 7: Build Integration (1 Task)

### Task 3.25: Integrate WASM into VS Code Build
**Status**: Not Started  
**Estimated Time**: 2-4 hours

**File**: `build/gulpfile.vscode.js` (or appropriate build file)

**Requirements**:
- Add task to call `scripts/build-dendrite.sh`
- Run before TypeScript compilation
- Copy WASM artifacts to `src/vs/workbench/contrib/dendrite/browser/wasm/`
- Include WASM in distribution package
- Fail build if WASM compilation fails

**Validation**:
- [ ] `yarn watch` builds WASM automatically
- [ ] WASM files present in dist/output
- [ ] wasmBridge loads successfully at runtime
- [ ] Build fails gracefully on WASM error

---

## Phase 8: Testing & Polish (2 Tasks)

### Task 3.26: End-to-End Integration Testing
**Status**: Not Started  
**Depends On**: All previous tasks  
**Estimated Time**: 4-8 hours

**Test Scenarios**:
1. Launch Dendrite IDE
2. Session auto-starts on first edit
3. Edit files → keystroke tracking works
4. Make git commit → appears in timeline
5. View dashboard → all 6 sections render
6. Export portfolio → all formats work
7. Change settings → immediate effect
8. Session goes idle → state changes
9. Resume activity → session resumes
10. Close IDE → session saves
11. Reopen IDE → data persists

**Validation**:
- [ ] All features work seamlessly together
- [ ] No runtime errors in console
- [ ] Performance acceptable (no lag)
- [ ] Data persists across restarts
- [ ] Memory usage reasonable

---

### Task 3.27: Documentation and Polish
**Status**: Not Started  
**Depends On**: 3.26  
**Estimated Time**: 4-6 hours

**File**: `src/vs/workbench/contrib/dendrite/README.md`

**Content**:
1. **User Guide**: How to use Dendrite features
2. **Developer Guide**: Architecture and contribution
3. **Build Instructions**: WASM requirements (rustc, wasm-pack)
4. **Troubleshooting**: Common issues and solutions
5. **Screenshots**: Dashboard, heatmap, exports

**Validation**:
- [ ] Documentation clear and complete
- [ ] Examples accurate and tested
- [ ] Screenshots up-to-date
- [ ] Links work correctly

---

## Critical Path Summary

Fastest path to working Dendrite IDE:

```
3.11 → 3.12 → 3.13 → (Settings Complete)
  ↓
3.1 → 3.2, 3.3, 3.4 → (Renderers Complete)
  ↓
3.6 → 3.7, 3.9 → 3.10 → (Commands Complete)
  ↓
3.14, 3.17, 3.18, 3.15 → (Dashboard Complete)
  ↓
3.20 → 3.25 → 3.26 → (Integration Complete)
```

**Estimated Total Time**: 60-90 hours for single developer

---

## References

- **Build Book**: [dendrite-core.buildbook.yaml](buildbook/dendrite-core.buildbook.yaml)
- **CATS Spec**: [dendrite-core.cats.yaml](cats/dendrite-core.cats.yaml)
- **Coverage Matrix**: [COVERAGE_MATRIX.md](COVERAGE_MATRIX.md)

---

**Last Updated**: 2025-12-15  
**Status**: Ready to begin implementation
