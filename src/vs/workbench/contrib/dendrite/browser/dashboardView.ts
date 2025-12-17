/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { IViewletViewOptions } from '../../../browser/parts/views/viewsViewlet.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { DendriteStorageService } from './storageService.js';
import { WasmBridge } from './wasmBridge.js';
import { ConfigKeys } from '../common/constants.js';
import { HeatmapData, LanguageStat } from '../common/types.js';
import * as DOM from '../../../../base/browser/dom.js';
import { IDisposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';

// Import renderers
import { HeatmapRenderer } from './renderers/heatmapRenderer.js';
import { LanguageChartRenderer } from './renderers/languageChartRenderer.js';
import { StreakRenderer, StreakData } from './renderers/streakRenderer.js';
import { CommitTimelineRenderer, CommitTimelineData } from './renderers/commitTimelineRenderer.js';

/**
 * Dendrite Dashboard View
 * Shows activity heatmap, language breakdown, streak, and commit timeline
 */
export class DendriteDashboardView extends ViewPane {
	private container: HTMLElement | undefined;
	private storageService: DendriteStorageService | undefined;
	private renderersDisposables: DisposableStore = new DisposableStore();

	// Renderers
	private heatmapRenderer: HeatmapRenderer | undefined;
	private languageChartRenderer: LanguageChartRenderer | undefined;
	private streakRenderer: StreakRenderer | undefined;
	private commitTimelineRenderer: CommitTimelineRenderer | undefined;

	// Sections
	private headerSection: HTMLElement | undefined;
	private statsSection: HTMLElement | undefined;
	private heatmapSection: HTMLElement | undefined;
	private languageSection: HTMLElement | undefined;
	private commitSection: HTMLElement | undefined;

	constructor(
		options: IViewletViewOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
		@IStorageService storageService: IStorageService
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
		this.storageService = new DendriteStorageService(storageService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		this.container = container;
		this.container.classList.add('dendrite-dashboard');

		// Apply base styles
		this.applyStyles();

		// Create layout
		this.createLayout();

		// Initialize data
		this.loadData();

		// Listen to config changes
		this.registerConfigListeners();
	}

	private applyStyles(): void {
		if (!this.container) {
			return;
		}

		this.container.style.cssText = `
			display: flex;
			flex-direction: column;
			gap: 16px;
			padding: 12px;
			overflow-y: auto;
			height: 100%;
		`;
	}

	private createLayout(): void {
		if (!this.container) {
			return;
		}

		// Header with title and status
		this.headerSection = this.createSection('header');
		this.createHeader(this.headerSection);

		// Stats row (streak + quick stats)
		this.statsSection = this.createSection('stats-row');
		this.statsSection.style.cssText = 'display: flex; gap: 16px; flex-wrap: wrap;';

		// Streak
		const streakContainer = DOM.append(this.statsSection, DOM.$('div.streak-container'));
		streakContainer.style.cssText = 'flex: 1; min-width: 200px;';
		this.createSectionHeader(streakContainer, 'Streak', '$(flame)');
		this.streakRenderer = this.renderersDisposables.add(new StreakRenderer(streakContainer));

		// Quick stats summary
		const quickStats = DOM.append(this.statsSection, DOM.$('div.quick-stats'));
		quickStats.style.cssText = 'flex: 1; min-width: 200px;';
		this.createSectionHeader(quickStats, 'Today', '$(calendar)');
		this.createQuickStats(quickStats);

		// Heatmap section
		this.heatmapSection = this.createSection('heatmap');
		this.createSectionHeader(this.heatmapSection, 'Activity', '$(graph)');
		this.heatmapRenderer = this.renderersDisposables.add(new HeatmapRenderer(this.heatmapSection));

		// Language section
		this.languageSection = this.createSection('languages');
		this.createSectionHeader(this.languageSection, 'Languages', '$(code)');
		this.languageChartRenderer = this.renderersDisposables.add(new LanguageChartRenderer(this.languageSection));

		// Commit timeline section
		this.commitSection = this.createSection('commits');
		this.createSectionHeader(this.commitSection, 'Recent Commits', '$(git-commit)');
		this.commitTimelineRenderer = this.renderersDisposables.add(new CommitTimelineRenderer(this.commitSection));
	}

	private createSection(id: string): HTMLElement {
		const section = DOM.append(this.container!, DOM.$(`div.dendrite-section.${id}`));
		section.style.cssText = `
			background: var(--vscode-sideBar-background);
			border: 1px solid var(--vscode-panel-border);
			border-radius: 6px;
			padding: 12px;
		`;
		return section;
	}

	private createSectionHeader(container: HTMLElement, title: string, icon: string): HTMLElement {
		const header = DOM.append(container, DOM.$('div.section-header'));
		header.style.cssText = `
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 12px;
			font-size: 13px;
			font-weight: 600;
			color: var(--vscode-foreground);
		`;

		const iconSpan = DOM.append(header, DOM.$('span.section-icon'));
		iconSpan.className = `codicon codicon-${icon.replace('$(', '').replace(')', '')}`;

		const titleSpan = DOM.append(header, DOM.$('span.section-title'));
		titleSpan.textContent = title;

		return header;
	}

	private createHeader(container: HTMLElement): void {
		container.style.cssText = `
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 8px 0;
			border-bottom: 1px solid var(--vscode-panel-border);
			margin-bottom: 8px;
		`;

		const titleArea = DOM.append(container, DOM.$('div.title-area'));
		const title = DOM.append(titleArea, DOM.$('h2.dashboard-title'));
		title.textContent = 'Growth Dashboard';
		title.style.cssText = 'margin: 0; font-size: 16px; font-weight: 600;';

		const subtitle = DOM.append(titleArea, DOM.$('div.dashboard-subtitle'));
		subtitle.textContent = 'Track your coding journey';
		subtitle.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px;';

		// Actions
		const actions = DOM.append(container, DOM.$('div.header-actions'));
		actions.style.cssText = 'display: flex; gap: 8px;';

		const refreshBtn = this.createIconButton(actions, 'refresh', 'Refresh', () => this.loadData());
		const exportBtn = this.createIconButton(actions, 'export', 'Export', () => {
			this.instantiationService.invokeFunction(accessor => {
				const commandService = accessor.get(ICommandService);
				commandService.executeCommand('dendrite.exportPortfolio');
			});
		});

		this.renderersDisposables.add(refreshBtn);
		this.renderersDisposables.add(exportBtn);
	}

	private createIconButton(container: HTMLElement, icon: string, tooltip: string, onClick: () => void): IDisposable {
		const btn = DOM.append(container, DOM.$('button.icon-button'));
		btn.style.cssText = `
			background: transparent;
			border: 1px solid var(--vscode-button-border);
			border-radius: 4px;
			padding: 4px 8px;
			cursor: pointer;
			display: flex;
			align-items: center;
			gap: 4px;
			color: var(--vscode-foreground);
		`;
		btn.title = tooltip;

		const iconSpan = DOM.append(btn, DOM.$('span'));
		iconSpan.className = `codicon codicon-${icon}`;

		btn.addEventListener('click', onClick);

		return toDisposable(() => btn.removeEventListener('click', onClick));
	}

	private createQuickStats(container: HTMLElement): void {
		const statsGrid = DOM.append(container, DOM.$('div.quick-stats-grid'));
		statsGrid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;';

		this.createStatItem(statsGrid, 'time-stat', '0h 0m', 'Coding time');
		this.createStatItem(statsGrid, 'keystroke-stat', '0', 'Keystrokes');
		this.createStatItem(statsGrid, 'files-stat', '0', 'Files edited');
		this.createStatItem(statsGrid, 'commits-stat', '0', 'Commits');
	}

	private createStatItem(container: HTMLElement, id: string, value: string, label: string): void {
		const item = DOM.append(container, DOM.$(`div.stat-item.${id}`));
		item.style.cssText = `
			text-align: center;
			padding: 8px;
			background: var(--vscode-editor-background);
			border-radius: 4px;
		`;

		const valueEl = DOM.append(item, DOM.$('div.stat-value'));
		valueEl.textContent = value;
		valueEl.style.cssText = 'font-size: 18px; font-weight: bold; color: var(--vscode-textLink-foreground);';

		const labelEl = DOM.append(item, DOM.$('div.stat-label'));
		labelEl.textContent = label;
		labelEl.style.cssText = 'font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 2px;';
	}

	private async loadData(): Promise<void> {
		try {
			await WasmBridge.instance.initialize();

			if (!this.storageService) {
				return;
			}

			const profileJson = this.storageService.getProfileJson();
			const heatmapWeeks = this.configurationService.getValue<number>(ConfigKeys.HEATMAP_WEEKS) || 12;

			// Load all data in parallel
			const [heatmapData, languageData, lifetimeStats] = await Promise.all([
				this.loadHeatmapData(profileJson, heatmapWeeks),
				this.loadLanguageData(profileJson),
				this.loadLifetimeStats(profileJson)
			]);

			// Update renderers
			this.heatmapRenderer?.update(heatmapData);
			this.languageChartRenderer?.update(languageData);
			this.updateStreakRenderer(profileJson);
			this.updateCommitTimeline(profileJson);
			this.updateQuickStats(lifetimeStats);

		} catch (error) {
			console.error('Failed to load Dendrite data:', error);
		}
	}

	private loadHeatmapData(profileJson: string, weeks: number): HeatmapData {
		try {
			return WasmBridge.instance.generateHeatmap(profileJson, weeks);
		} catch {
			return { cells: [], max_minutes: 0, weeks, total_minutes: 0 };
		}
	}

	private loadLanguageData(profileJson: string): LanguageStat[] {
		try {
			return WasmBridge.instance.generateLanguageBreakdown(profileJson);
		} catch {
			return [];
		}
	}

	private loadLifetimeStats(profileJson: string): { total_time_ms: number; total_keystrokes: number; total_commits: number } {
		try {
			return WasmBridge.instance.getProfileStats(profileJson);
		} catch {
			return { total_time_ms: 0, total_keystrokes: 0, total_commits: 0 };
		}
	}

	private updateStreakRenderer(profileJson: string): void {
		if (!this.streakRenderer) {
			return;
		}

		try {
			const currentStreak = WasmBridge.instance.getCurrentStreak(profileJson);
			const longestStreak = WasmBridge.instance.getLongestStreak(profileJson);

			const streakData: StreakData = {
				currentStreak,
				longestStreak,
				lastActiveDate: null, // Could be computed from profile
				isActiveToday: currentStreak > 0 // Simplified
			};

			this.streakRenderer.update(streakData);
		} catch {
			this.streakRenderer.update({ currentStreak: 0, longestStreak: 0, lastActiveDate: null, isActiveToday: false });
		}
	}

	private updateCommitTimeline(profileJson: string): void {
		if (!this.commitTimelineRenderer) {
			return;
		}

		try {
			const correlations = WasmBridge.instance.getCommitCorrelations(profileJson);

			// Extract commits from correlations
			const commits = correlations.map((c: { commit: { hash: string; short_hash: string; message: string; timestamp: string; files_changed: string[] } }) => c.commit);

			const timelineData: CommitTimelineData = {
				commits,
				todayCount: this.countTodayCommits(commits),
				weekCount: this.countWeekCommits(commits)
			};

			this.commitTimelineRenderer.update(timelineData);
		} catch {
			this.commitTimelineRenderer.update({ commits: [], todayCount: 0, weekCount: 0 });
		}
	}

	private countTodayCommits(commits: { timestamp: string }[]): number {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return commits.filter(c => new Date(c.timestamp) >= today).length;
	}

	private countWeekCommits(commits: { timestamp: string }[]): number {
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);
		return commits.filter(c => new Date(c.timestamp) >= weekAgo).length;
	}

	private updateQuickStats(stats: { total_time_ms: number; total_keystrokes: number; total_commits: number }): void {
		if (!this.statsSection) {
			return;
		}

		const timeEl = this.statsSection.querySelector('.time-stat .stat-value');
		const keystrokeEl = this.statsSection.querySelector('.keystroke-stat .stat-value');
		const commitsEl = this.statsSection.querySelector('.commits-stat .stat-value');

		if (timeEl) {
			timeEl.textContent = this.formatTime(stats.total_time_ms);
		}
		if (keystrokeEl) {
			keystrokeEl.textContent = this.formatNumber(stats.total_keystrokes);
		}
		if (commitsEl) {
			commitsEl.textContent = String(stats.total_commits);
		}
	}

	private formatTime(ms: number): string {
		const minutes = Math.floor(ms / (1000 * 60));
		const hours = Math.floor(minutes / 60);
		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		}
		return `${minutes}m`;
	}

	private formatNumber(num: number): string {
		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		} else if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return String(num);
	}

	private registerConfigListeners(): void {
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(ConfigKeys.HEATMAP_WEEKS)) {
				this.loadData();
			}
		}));
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);

		// Could adjust renderer sizes based on available space
		if (this.heatmapRenderer && width > 0) {
			this.heatmapRenderer.layout(width - 24, 120);
		}
	}

	override dispose(): void {
		this.renderersDisposables.dispose();
		super.dispose();
	}
}

// Import ICommandService for export button
import { ICommandService } from '../../../../platform/commands/common/commands.js';
