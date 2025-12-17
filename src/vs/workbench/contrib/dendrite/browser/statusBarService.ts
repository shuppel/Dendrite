/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Dendrite IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { IStatusbarService, StatusbarAlignment, IStatusbarEntryAccessor } from '../../../services/statusbar/browser/statusbar.js';
import { localize } from '../../../../nls.js';
import { SessionState } from '../common/types.js';
import { CommandIds } from '../common/constants.js';
import { DendriteSessionLifecycleService } from './sessionLifecycleService.js';
import { WasmBridge } from './wasmBridge.js';
import { DendriteStorageService } from './storageService.js';


const DENDRITE_STATUS_ID = 'dendrite.status';

/**
 * Status bar service for Dendrite
 * Shows current session state, time, and quick actions
 */
export class DendriteStatusBarService extends Disposable {
	private readonly statusBarEntry: MutableDisposable<IStatusbarEntryAccessor> = this._register(new MutableDisposable());
	private updateInterval: ReturnType<typeof setInterval> | undefined;

	constructor(
		private readonly lifecycleService: DendriteSessionLifecycleService,
		private readonly storageService: DendriteStorageService,
		@IStatusbarService private readonly statusbarService: IStatusbarService
	) {
		super();
		this.createStatusBarEntry();
		this.registerListeners();
		this.startUpdateLoop();
	}

	private createStatusBarEntry(): void {
		const entry = this.statusbarService.addEntry(
			this.getStatusBarEntry(),
			DENDRITE_STATUS_ID,
			StatusbarAlignment.RIGHT,
			1000 // High priority to show near the clock
		);
		this.statusBarEntry.value = entry;
	}

	private registerListeners(): void {
		this._register(this.lifecycleService.onDidChangeSessionState(() => {
			this.updateStatusBar();
		}));
	}

	private startUpdateLoop(): void {
		// Update every 30 seconds to refresh time display
		this.updateInterval = setInterval(() => {
			if (this.lifecycleService.state === SessionState.ACTIVE) {
				this.updateStatusBar();
			}
		}, 30000);
	}

	private updateStatusBar(): void {
		this.statusBarEntry.value?.update(this.getStatusBarEntry());
	}

	private getStatusBarEntry() {
		const state = this.lifecycleService.state;
		const { icon, text, tooltip, command } = this.getStateDisplay(state);

		return {
			name: localize('dendrite.statusbar.name', "Dendrite"),
			text: `${icon} ${text}`,
			tooltip,
			ariaLabel: tooltip,
			command,
			backgroundColor: this.getBackgroundColor(state),
			color: undefined
		};
	}

	private getStateDisplay(state: SessionState): { 
		icon: string; 
		text: string; 
		tooltip: string; 
		command: string; 
	} {
		switch (state) {
			case SessionState.ACTIVE: {
				const time = this.getActiveSessionTime();
				return {
					icon: '$(pulse)',
					text: time,
					tooltip: localize('dendrite.statusbar.active', "Dendrite: Active - Click to pause\n{0} coding time", time),
					command: CommandIds.PAUSE_SESSION
				};
			}
			case SessionState.PAUSED:
				return {
					icon: '$(debug-pause)',
					text: localize('dendrite.statusbar.pausedText', "Paused"),
					tooltip: localize('dendrite.statusbar.paused', "Dendrite: Paused - Click to resume"),
					command: CommandIds.RESUME_SESSION
				};
			case SessionState.IDLE: {
				const time = this.getActiveSessionTime();
				return {
					icon: '$(watch)',
					text: time,
					tooltip: localize('dendrite.statusbar.idle', "Dendrite: Idle - Activity will resume tracking"),
					command: CommandIds.SHOW_STATS
				};
			}
			case SessionState.ENDED:
			default:
				return {
					icon: '$(circle-outline)',
					text: localize('dendrite.statusbar.startText', "Start"),
					tooltip: localize('dendrite.statusbar.ended', "Dendrite: No active session - Click to start"),
					command: CommandIds.START_SESSION
				};
		}
	}

	private getBackgroundColor(state: SessionState): string | undefined {
		switch (state) {
			case SessionState.ACTIVE:
				return 'statusBarItem.prominentBackground';
			case SessionState.PAUSED:
				return 'statusBarItem.warningBackground';
			case SessionState.IDLE:
				return undefined;
			default:
				return undefined;
		}
	}

	private getActiveSessionTime(): string {
		try {
			const profileJson = this.storageService.getProfileJson();
			const stats = WasmBridge.instance.getProfileStats(profileJson);
			return this.formatTime(stats.total_time_ms);
		} catch {
			return '0m';
		}
	}

	private formatTime(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		} else if (minutes > 0) {
			return `${minutes}m`;
		} else {
			return '< 1m';
		}
	}

	override dispose(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
		}
		super.dispose();
	}
}
