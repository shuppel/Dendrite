/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { Disposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService, IConfigurationChangeEvent } from '../../../../platform/configuration/common/configuration.js';
import { ConfigKeys } from '../common/constants.js';
import { Emitter, Event } from '../../../../base/common/event.js';

/**
 * Dendrite settings interface
 */
export interface IDendriteSettings {
	enabled: boolean;
	idleThresholdMs: number;
	autoStart: boolean;
	trackGit: boolean;
	heatmapWeeks: number;
	showStreakNotification: boolean;
}

/**
 * Settings change event with old and new values
 */
export interface IDendriteSettingsChangeEvent {
	readonly key: keyof IDendriteSettings;
	readonly oldValue: unknown;
	readonly newValue: unknown;
}

/**
 * Service for managing Dendrite configuration with change notifications
 */
export class DendriteSettingsService extends Disposable {
	private _settings: IDendriteSettings;

	private readonly _onDidChangeSettings = this._register(new Emitter<IDendriteSettingsChangeEvent>());
	public readonly onDidChangeSettings: Event<IDendriteSettingsChangeEvent> = this._onDidChangeSettings.event;

	private readonly _onDidChangeEnabled = this._register(new Emitter<boolean>());
	public readonly onDidChangeEnabled: Event<boolean> = this._onDidChangeEnabled.event;

	private readonly _onDidChangeIdleThreshold = this._register(new Emitter<number>());
	public readonly onDidChangeIdleThreshold: Event<number> = this._onDidChangeIdleThreshold.event;

	private readonly _onDidChangeAutoStart = this._register(new Emitter<boolean>());
	public readonly onDidChangeAutoStart: Event<boolean> = this._onDidChangeAutoStart.event;

	private readonly _onDidChangeTrackGit = this._register(new Emitter<boolean>());
	public readonly onDidChangeTrackGit: Event<boolean> = this._onDidChangeTrackGit.event;

	private readonly _onDidChangeHeatmapWeeks = this._register(new Emitter<number>());
	public readonly onDidChangeHeatmapWeeks: Event<number> = this._onDidChangeHeatmapWeeks.event;

	private readonly _onDidChangeShowStreakNotification = this._register(new Emitter<boolean>());
	public readonly onDidChangeShowStreakNotification: Event<boolean> = this._onDidChangeShowStreakNotification.event;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super();
		this._settings = this.loadSettings();
		this.registerListeners();
	}

	/**
	 * Load all settings from configuration
	 */
	private loadSettings(): IDendriteSettings {
		return {
			enabled: this.configurationService.getValue<boolean>(ConfigKeys.ENABLED) ?? true,
			idleThresholdMs: this.configurationService.getValue<number>(ConfigKeys.IDLE_THRESHOLD) ?? 300000,
			autoStart: this.configurationService.getValue<boolean>(ConfigKeys.AUTO_START) ?? true,
			trackGit: this.configurationService.getValue<boolean>(ConfigKeys.TRACK_GIT) ?? true,
			heatmapWeeks: this.configurationService.getValue<number>(ConfigKeys.HEATMAP_WEEKS) ?? 12,
			showStreakNotification: this.configurationService.getValue<boolean>(ConfigKeys.SHOW_STREAK_NOTIFICATION) ?? true
		};
	}

	/**
	 * Register configuration change listeners
	 */
	private registerListeners(): void {
		this._register(this.configurationService.onDidChangeConfiguration((e: IConfigurationChangeEvent) => {
			if (e.affectsConfiguration(ConfigKeys.ENABLED)) {
				this.handleSettingChange('enabled', ConfigKeys.ENABLED, this._onDidChangeEnabled);
			}
			if (e.affectsConfiguration(ConfigKeys.IDLE_THRESHOLD)) {
				this.handleSettingChange('idleThresholdMs', ConfigKeys.IDLE_THRESHOLD, this._onDidChangeIdleThreshold);
			}
			if (e.affectsConfiguration(ConfigKeys.AUTO_START)) {
				this.handleSettingChange('autoStart', ConfigKeys.AUTO_START, this._onDidChangeAutoStart);
			}
			if (e.affectsConfiguration(ConfigKeys.TRACK_GIT)) {
				this.handleSettingChange('trackGit', ConfigKeys.TRACK_GIT, this._onDidChangeTrackGit);
			}
			if (e.affectsConfiguration(ConfigKeys.HEATMAP_WEEKS)) {
				this.handleSettingChange('heatmapWeeks', ConfigKeys.HEATMAP_WEEKS, this._onDidChangeHeatmapWeeks);
			}
			if (e.affectsConfiguration(ConfigKeys.SHOW_STREAK_NOTIFICATION)) {
				this.handleSettingChange('showStreakNotification', ConfigKeys.SHOW_STREAK_NOTIFICATION, this._onDidChangeShowStreakNotification);
			}
		}));
	}

	/**
	 * Handle a setting change
	 */
	private handleSettingChange<T>(
		key: keyof IDendriteSettings,
		configKey: string,
		specificEmitter: Emitter<T>
	): void {
		const oldValue = this._settings[key];
		const newValue = this.configurationService.getValue<T>(configKey);

		if (oldValue !== newValue) {
			// Use type assertion through unknown to safely update the settings
			(this._settings as unknown as Record<string, unknown>)[key] = newValue;
			
			// Fire specific event
			specificEmitter.fire(newValue as T);
			
			// Fire general event
			this._onDidChangeSettings.fire({ key, oldValue, newValue });
		}
	}

	// Getters for current settings

	public get enabled(): boolean {
		return this._settings.enabled;
	}

	public get idleThresholdMs(): number {
		return this._settings.idleThresholdMs;
	}

	public get autoStart(): boolean {
		return this._settings.autoStart;
	}

	public get trackGit(): boolean {
		return this._settings.trackGit;
	}

	public get heatmapWeeks(): number {
		return this._settings.heatmapWeeks;
	}

	public get showStreakNotification(): boolean {
		return this._settings.showStreakNotification;
	}

	/**
	 * Get all settings as an object
	 */
	public getAll(): IDendriteSettings {
		return { ...this._settings };
	}

	/**
	 * Update a setting value
	 */
	public async updateSetting<K extends keyof IDendriteSettings>(
		key: K,
		value: IDendriteSettings[K]
	): Promise<void> {
		const configKey = this.getConfigKey(key);
		await this.configurationService.updateValue(configKey, value);
	}

	/**
	 * Map internal key to config key
	 */
	private getConfigKey(key: keyof IDendriteSettings): string {
		const mapping: Record<keyof IDendriteSettings, string> = {
			enabled: ConfigKeys.ENABLED,
			idleThresholdMs: ConfigKeys.IDLE_THRESHOLD,
			autoStart: ConfigKeys.AUTO_START,
			trackGit: ConfigKeys.TRACK_GIT,
			heatmapWeeks: ConfigKeys.HEATMAP_WEEKS,
			showStreakNotification: ConfigKeys.SHOW_STREAK_NOTIFICATION
		};
		return mapping[key];
	}
}
